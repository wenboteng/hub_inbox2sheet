import { PrismaClient } from '@prisma/client';
import type { Page } from 'puppeteer';
import { randomBytes } from 'crypto';
import { getContentEmbeddings, getEmbedding } from '@/utils/openai';
import { scrapeAirbnb } from '@/scripts/scrapers/airbnb';
import { crawlGetYourGuideArticles, crawlGetYourGuideArticlesWithPagination } from '@/crawlers/getyourguide';
import { scrapeCommunityUrls, getCommunityContentUrls } from '@/lib/communityCrawler';
import { crawlNewsAndPolicies } from '@/crawlers/news-policy';
import {
  generateContentHash,
  checkContentDuplicate,
  markArticleAsDuplicate,
  getDeduplicationStats,
  DEFAULT_DEDUP_CONFIG,
} from '@/utils/contentDeduplication';
import { isFeatureEnabled, getFeatureFlagsSummary } from '@/utils/featureFlags';
import { detectLanguage } from '@/utils/languageDetection';
import { slugify } from '@/utils/slugify';
import { crawlViatorArticles } from '@/crawlers/viator';
import { crawlExpedia } from '@/crawlers/expedia';

// Enhanced Prisma client with retry logic
class RetryablePrismaClient extends PrismaClient {
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  async connectWithRetry(): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[DB] Attempting database connection (attempt ${attempt}/${this.maxRetries})...`);
        await this.$connect();
        console.log(`[DB] Database connection successful on attempt ${attempt}`);
        return;
      } catch (error) {
        lastError = error as Error;
        console.error(`[DB] Connection attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxRetries) {
          console.log(`[DB] Waiting ${this.retryDelay / 1000} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          // Increase delay for next attempt
          this.retryDelay *= 1.5;
        }
      }
    }
    
    throw new Error(`Failed to connect to database after ${this.maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  async queryWithRetry<T>(queryFn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await queryFn();
      } catch (error) {
        lastError = error as Error;
        console.error(`[DB] Query attempt ${attempt} failed:`, error);
        
        // Check if it's a connection error
        if (error instanceof Error && (
          error.message.includes("Can't reach database server") ||
          error.message.includes("Connection terminated") ||
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ENOTFOUND")
        )) {
          if (attempt < this.maxRetries) {
            console.log(`[DB] Connection error detected. Attempting to reconnect...`);
            try {
              await this.$disconnect();
              await new Promise(resolve => setTimeout(resolve, 2000));
              await this.connectWithRetry();
            } catch (reconnectError) {
              console.error(`[DB] Reconnection failed:`, reconnectError);
            }
          }
        }
        
        if (attempt < this.maxRetries) {
          console.log(`[DB] Waiting ${this.retryDelay / 1000} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    
    throw new Error(`Query failed after ${this.maxRetries} attempts. Last error: ${lastError?.message}`);
  }
}

const prisma = new RetryablePrismaClient({
  log: ['error', 'warn'],
});

interface Article {
  url: string;
  question: string;
  answer: string;
  platform: string;
  category: string;
  contentType: 'official' | 'community';
}

interface ParagraphWithEmbedding {
  text: string;
  embedding: number[];
}

// Helper function to setup a page
async function setupPage(page: Page) {
  await page.setViewport({
    width: 1280,
    height: 800
  });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.setDefaultTimeout(120000);
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });
  page.on('dialog', async (dialog) => {
    console.log(`[PUPPETEER] Dismissing dialog: ${dialog.message()}`);
    await dialog.dismiss();
  });
}

// Function to get existing article URLs from database with retry
async function getExistingArticleUrls(): Promise<Set<string>> {
  return await prisma.queryWithRetry(async () => {
    const existingArticles = await prisma.article.findMany({
      select: { url: true },
    });
    return new Set(existingArticles.map((a: { url: string }) => a.url));
  });
}

// Function to log scraping statistics with retry
async function logScrapingStats() {
  await prisma.queryWithRetry(async () => {
    const totalArticles = await prisma.article.count();
    const officialArticles = await prisma.article.count({
      where: { contentType: 'official' },
    });
    const communityArticles = await prisma.article.count({
      where: { contentType: 'community' },
    });

    const platformStats = await prisma.article.groupBy({
      by: ['platform'],
      _count: { id: true },
    });

    console.log('\n📊 DATABASE STATISTICS:');
    console.log(`Total articles: ${totalArticles}`);
    console.log(`Official articles: ${officialArticles}`);
    console.log(`Community articles: ${communityArticles}`);
    console.log('\nPlatform breakdown:');
    platformStats.forEach((stat: { platform: string; _count: { id: number } }) => {
      console.log(`  ${stat.platform}: ${stat._count.id} articles`);
    });
  });
}

// Enhanced debug function to validate article data
function validateArticle(article: Article, platform: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!article.url || article.url.trim() === '') issues.push('Empty or missing URL');
  if (!article.question || article.question.trim() === '') issues.push('Empty or missing question/title');
  if (!article.answer || article.answer.trim() === '') issues.push('Empty or missing answer/content');
  if (article.answer && article.answer.length < 50) issues.push(`Content too short (${article.answer.length} characters)`);
  if (!article.platform || article.platform.trim() === '') issues.push('Empty or missing platform');
  if (!article.category || article.category.trim() === '') issues.push('Empty or missing category');

  const isValid = issues.length === 0;
  if (!isValid) {
    console.log(`[DEBUG][${platform}] Article validation failed for ${article.url}:`);
    issues.forEach((issue) => console.log(`[DEBUG][${platform}]   - ${issue}`));
  }
  return { isValid, issues };
}

// Generates a unique slug, handling potential collisions with retry
async function generateUniqueSlug(title: string): Promise<string> {
  return await prisma.queryWithRetry(async () => {
    let slug = slugify(title);
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      const existingSlug = await prisma.article.findUnique({ where: { slug } });
      if (existingSlug) {
        console.log(`[SLUG] Slug conflict detected for "${slug}". Generating a new one.`);
        const randomSuffix = randomBytes(3).toString('hex'); // e.g., 'a1b2c3'
        slug = `${slugify(title)}-${randomSuffix}`;
        attempts++;
      } else {
        isUnique = true;
      }
    }
    if (!isUnique) {
      // Final fallback to a completely random slug
      const finalSuffix = randomBytes(6).toString('hex');
      slug = `article-${finalSuffix}`;
      console.log(`[SLUG] Using fallback slug: ${slug}`);
    }
    return slug;
  });
}

// Main scraping function with enhanced error handling
async function main() {
  console.log('[SCRAPE] Starting comprehensive scraping with retry logic...');
  
  try {
    // Connect to database with retry
    await prisma.connectWithRetry();
    console.log('[SCRAPE] Database connection established successfully');
    
    // Get existing URLs to avoid duplicates
    const existingUrls = await getExistingArticleUrls();
    console.log(`[SCRAPE] Found ${existingUrls.size} existing articles`);
    
    // Import scraping functions
    const { scrapeAirbnbCommunity } = await import('./scrape');
    
    // Scrape Airbnb Community
    console.log('[SCRAPE] ===== AIRBNB COMMUNITY SCRAPING =====');
    const communityArticles = await scrapeAirbnbCommunity();
    console.log(`[SCRAPE] Found ${communityArticles.length} community articles`);
    
    // Filter out existing articles
    const newCommunityArticles = communityArticles.filter(article => !existingUrls.has(article.url));
    console.log(`[SCRAPE] ${newCommunityArticles.length} new community articles`);
    
    // Save new articles to database
    for (const article of newCommunityArticles) {
      try {
        // Generate unique slug
        const slug = await generateUniqueSlug(article.question);
        
        // Detect language
        const languageDetection = detectLanguage(article.answer);
        
        // Generate embeddings for content
        const paragraphs = article.answer.split('\n\n').filter(p => p.trim().length > 50);
        const paragraphsWithEmbeddings: ParagraphWithEmbedding[] = [];
        
        for (const paragraph of paragraphs.slice(0, 5)) {
          try {
            const embedding = await getEmbedding(paragraph);
            paragraphsWithEmbeddings.push({ text: paragraph, embedding });
          } catch (error) {
            console.error(`[SCRAPE] Error generating embedding for paragraph:`, error);
          }
        }
        
        // Create article
        const created = await prisma.article.create({
          data: {
            url: article.url,
            question: article.question,
            answer: article.answer,
            slug,
            category: article.category,
            platform: article.platform,
            contentType: article.contentType,
            source: 'community',
            language: languageDetection.language,
            crawlStatus: 'active',
          }
        });
        
        // Create paragraphs if embeddings were generated
        if (paragraphsWithEmbeddings.length > 0) {
          await prisma.articleParagraph.createMany({
            data: paragraphsWithEmbeddings.map(p => ({
              articleId: created.id,
              text: p.text,
              embedding: p.embedding as any,
            })),
          });
          console.log(`[SCRAPE] Created ${paragraphsWithEmbeddings.length} paragraph embeddings`);
        }
        
        console.log(`[SCRAPE] Saved article: ${article.question}`);
      } catch (error) {
        console.error(`[SCRAPE] Error saving article ${article.url}:`, error);
      }
    }
    
    // Log final statistics
    await logScrapingStats();
    
  } catch (error) {
    console.error('[SCRAPE] Error in main scraping function:', error);
    
    // Provide detailed error information
    if (error instanceof Error) {
      console.error('[SCRAPE] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('[SCRAPE] Database connection closed');
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().then(() => {
    console.log('[SCRAPE] Scraping completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('[SCRAPE] Scraping failed:', error);
    process.exit(1);
  });
} 