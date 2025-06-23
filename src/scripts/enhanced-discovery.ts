import { PrismaClient } from '@prisma/client';
import type { Page } from 'puppeteer';
import { getContentEmbeddings } from '@/utils/openai';
import { scrapeAirbnb } from '@/scripts/scrapers/airbnb';
import { crawlGetYourGuideArticles, crawlGetYourGuideArticlesWithPagination } from '@/crawlers/getyourguide';
import { scrapeCommunityUrls, getCommunityContentUrls } from '@/lib/communityCrawler';
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
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

interface Article {
  url: string;
  question: string;
  answer: string;
  platform: string;
  category: string;
  contentType: 'official' | 'community';
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

// Function to get existing article URLs from database
async function getExistingArticleUrls(): Promise<Set<string>> {
  const existingArticles = await prisma.article.findMany({
    select: { url: true },
  });
  return new Set(existingArticles.map((a: { url: string }) => a.url));
}

// Enhanced URL discovery with more sources
async function discoverNewUrls(): Promise<string[]> {
  console.log('[DISCOVERY] Starting enhanced URL discovery...');
  const discoveredUrls = new Set<string>();
  
  // Expanded discovery sources
  const discoverySources = [
    // Airbnb sources
    'https://www.airbnb.com/help',
    'https://www.airbnb.com/help/article/2855',
    'https://www.airbnb.com/help/article/2856',
    'https://www.airbnb.com/help/article/2857',
    'https://www.airbnb.com/help/article/2858',
    'https://www.airbnb.com/help/article/2859',
    'https://www.airbnb.com/help/article/2860',
    
    // GetYourGuide sources
    'https://supply.getyourguide.support/hc/en-us',
    'https://supply.getyourguide.support/hc/en-us/categories/360000000012',
    'https://supply.getyourguide.support/hc/en-us/categories/360000000032',
    'https://supply.getyourguide.support/hc/en-us/categories/360000000052',
    
    // Viator sources
    'https://www.viator.com/help/',
    'https://www.viator.com/help/booking',
    'https://www.viator.com/help/payment',
    'https://www.viator.com/help/cancellation',
    
    // Community sources
    'https://community.withairbnb.com',
    'https://community.withairbnb.com/t5/Community-Center/ct-p/community-center',
    'https://community.withairbnb.com/t5/Hosting/ct-p/hosting',
    'https://community.withairbnb.com/t5/Guests/ct-p/guests',
    
    // Reddit sources
    'https://www.reddit.com/r/AirBnB/',
    'https://www.reddit.com/r/travel/',
    'https://www.reddit.com/r/backpacking/',
    
    // Quora sources
    'https://www.quora.com/topic/Airbnb',
    'https://www.quora.com/topic/Travel',
    'https://www.quora.com/topic/Vacation-Rentals',
  ];
  
  for (const source of discoverySources) {
    try {
      console.log(`[DISCOVERY] Exploring ${source}...`);
      const response = await fetch(source, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (response.ok) {
        const html = await response.text();
        const urlRegex = /href=["']([^"']+)["']/g;
        let match;
        
        while ((match = urlRegex.exec(html)) !== null) {
          const href = match[1];
          if (href && (
            href.includes('help') || 
            href.includes('article') || 
            href.includes('support') ||
            href.includes('community') ||
            href.includes('reddit.com') ||
            href.includes('quora.com')
          )) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, source).toString();
            discoveredUrls.add(fullUrl);
          }
        }
      }
    } catch (error) {
      console.log(`[DISCOVERY] Error exploring ${source}:`, error);
    }
  }
  
  console.log(`[DISCOVERY] Discovered ${discoveredUrls.size} potential URLs`);
  return Array.from(discoveredUrls);
}

// Deep scraping of specific platforms with pagination
async function deepScrapeAirbnb(): Promise<Article[]> {
  console.log('[DEEP-SCRAPE] Starting deep Airbnb scraping...');
  const articles: Article[] = [];
  
  try {
    const { createBrowser } = await import('@/utils/puppeteer');
    const browser = await createBrowser();
    
    try {
      const page = await browser.newPage();
      await setupPage(page);
      
      // Scrape multiple pages of help articles
      const helpPages = [
        'https://www.airbnb.com/help',
        'https://www.airbnb.com/help/article/2855',
        'https://www.airbnb.com/help/article/2856',
        'https://www.airbnb.com/help/article/2857',
        'https://www.airbnb.com/help/article/2858',
        'https://www.airbnb.com/help/article/2859',
        'https://www.airbnb.com/help/article/2860',
      ];
      
      for (const helpPage of helpPages) {
        try {
          console.log(`[DEEP-SCRAPE] Scraping ${helpPage}...`);
          await page.goto(helpPage, { waitUntil: 'domcontentloaded', timeout: 30000 });
          
          // Extract all article links
          const articleLinks = await page.$$eval('a[href*="/help/article/"]', (links) =>
            links.map((link: Element) => (link as HTMLAnchorElement).href)
          );
          
          console.log(`[DEEP-SCRAPE] Found ${articleLinks.length} article links on ${helpPage}`);
          
          // Scrape each article
          for (const articleUrl of articleLinks.slice(0, 10)) { // Limit to 10 per page
            try {
              await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
              
              const articleData = await page.evaluate(() => {
                const title = document.querySelector('h1, .title, .article-title')?.textContent?.trim() || '';
                const content = document.querySelector('.article-content, .content, .body')?.textContent?.trim() || '';
                return { title, content };
              });
              
              if (articleData.title && articleData.content && articleData.content.length > 100) {
                articles.push({
                  url: articleUrl,
                  question: articleData.title,
                  answer: articleData.content,
                  platform: 'Airbnb',
                  category: 'Help Center',
                  contentType: 'official'
                });
                console.log(`[DEEP-SCRAPE] Scraped: ${articleData.title}`);
              }
              
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
              console.error(`[DEEP-SCRAPE] Error scraping article ${articleUrl}:`, error);
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`[DEEP-SCRAPE] Error scraping help page ${helpPage}:`, error);
        }
      }
      
      await page.close();
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('[DEEP-SCRAPE] Failed to create browser:', error);
  }
  
  console.log(`[DEEP-SCRAPE] Deep Airbnb scraping completed. Found ${articles.length} articles`);
  return articles;
}

// Generates a unique slug, handling potential collisions.
async function generateUniqueSlug(title: string): Promise<string> {
  let slug = slugify(title);
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 5) {
    const existingSlug = await prisma.article.findUnique({ where: { slug } });
    if (existingSlug) {
      console.log(`[SLUG] Slug conflict detected for "${slug}". Generating a new one.`);
      const randomSuffix = randomBytes(3).toString('hex');
      slug = `${slugify(title)}-${randomSuffix}`;
      attempts++;
    } else {
      isUnique = true;
    }
  }
  if (!isUnique) {
    const finalSuffix = randomBytes(6).toString('hex');
    slug = `article-${finalSuffix}`;
    console.log(`[SLUG] Could not generate a unique slug for title "${title}". Using fallback: ${slug}`);
  }
  return slug;
}

async function main() {
  try {
    console.log('[ENHANCED-DISCOVERY] Starting enhanced discovery process...');
    await prisma.$connect();
    console.log('[ENHANCED-DISCOVERY] Database connection successful');
    
    const existingUrls = await getExistingArticleUrls();
    console.log(`[ENHANCED-DISCOVERY] Found ${existingUrls.size} existing articles in database`);
    
    let allArticles: Article[] = [];
    
    // Enhanced URL discovery
    try {
      const discoveredUrls = await discoverNewUrls();
      console.log(`[ENHANCED-DISCOVERY] Discovered ${discoveredUrls.length} potential new URLs`);
    } catch (e) {
      console.error('[ENHANCED-DISCOVERY] URL discovery failed:', e);
    }
    
    // Deep scraping
    try {
      const deepAirbnbArticles = await deepScrapeAirbnb();
      allArticles = allArticles.concat(deepAirbnbArticles);
    } catch (e) {
      console.error('[ENHANCED-DISCOVERY] Deep Airbnb scraping failed:', e);
    }
    
    // Regular scrapers
    const scrapers = [
      { name: 'Airbnb', scraper: scrapeAirbnb, enabled: true },
      { name: 'GetYourGuide', scraper: crawlGetYourGuideArticlesWithPagination, enabled: isFeatureEnabled('enableGetYourGuidePagination') },
      { name: 'Viator', scraper: crawlViatorArticles, enabled: isFeatureEnabled('enableViatorScraping') },
    ];

    for (const scraper of scrapers) {
      if (scraper.enabled) {
        console.log(`\n[ENHANCED-DISCOVERY] Starting ${scraper.name} scraping...`);
        try {
          const articles = await scraper.scraper();
          const mappedArticles = articles.map((a: any) => ({
            ...a,
            platform: scraper.name,
            contentType: 'official',
            category: a.category || 'Help Center',
          }));
          allArticles = allArticles.concat(mappedArticles);
        } catch (e) {
          console.error(`[ENHANCED-DISCOVERY] ${scraper.name} scraping failed:`, e);
        }
      }
    }

    console.log(`\n[ENHANCED-DISCOVERY] Found a total of ${allArticles.length} articles from all sources.`);

    const newArticles = allArticles.filter(article => !existingUrls.has(article.url));
    console.log(`[ENHANCED-DISCOVERY] ${newArticles.length} are new articles not yet in the database.`);

    let processedCount = 0, errorCount = 0;
    
    for (const article of newArticles) {
      try {
        const contentHash = generateContentHash(article.answer);
        let isDuplicate = false;
        if (contentHash) {
          const duplicateCheck = await checkContentDuplicate(contentHash);
          if (duplicateCheck.isDuplicate) {
            console.log(`[ENHANCED-DISCOVERY][DEDUP] Found content duplicate of ${duplicateCheck.existingArticle?.url}.`);
            isDuplicate = true;
          }
        }
        
        const languageDetection = detectLanguage(article.answer);
        const slug = await generateUniqueSlug(article.question);
        
        let paragraphsWithEmbeddings: any[] = [];
        try {
          paragraphsWithEmbeddings = await getContentEmbeddings(article.answer);
        } catch (embeddingError) {
          console.error('[ENHANCED-DISCOVERY] Failed to generate embeddings:', embeddingError);
        }

        const created = await prisma.article.create({
          data: {
            url: article.url,
            question: article.question,
            slug: slug,
            answer: article.answer,
            category: article.category,
            platform: article.platform,
            contentType: article.contentType,
            source: 'help_center',
            contentHash: contentHash || null,
            isDuplicate: isDuplicate,
            language: languageDetection.language,
          },
        });

        if (paragraphsWithEmbeddings.length > 0) {
          await prisma.articleParagraph.createMany({
            data: paragraphsWithEmbeddings.map(p => ({
              articleId: created.id,
              text: p.text,
              embedding: p.embedding,
            })),
          });
        }
        processedCount++;
        console.log(`[ENHANCED-DISCOVERY] Successfully processed article: ${article.question}`);
      } catch (articleError: any) {
        console.error(`[ENHANCED-DISCOVERY] Error processing article "${article.question}" (${article.url}):`);
        console.error(articleError.message);
        errorCount++;
      }
    }

    console.log(`\n[ENHANCED-DISCOVERY] Processing summary:`);
    console.log(`[ENHANCED-DISCOVERY] - New articles processed: ${processedCount}`);
    console.log(`[ENHANCED-DISCOVERY] - Articles with errors: ${errorCount}`);
    console.log(`[ENHANCED-DISCOVERY] - Total new articles attempted: ${newArticles.length}`);

    console.log('\n[ENHANCED-DISCOVERY] Enhanced discovery process completed successfully');
  } catch (error) {
    console.error('[ENHANCED-DISCOVERY] Error during enhanced discovery:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('[ENHANCED-DISCOVERY] Database connection closed');
  }
}

main(); 