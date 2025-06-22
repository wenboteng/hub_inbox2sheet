import { PrismaClient } from '@prisma/client';
import type { Page } from 'puppeteer';
import { randomBytes } from 'crypto';
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

const prisma = new PrismaClient();

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

// Function to get existing article URLs from database
async function getExistingArticleUrls(): Promise<Set<string>> {
  const existingArticles = await prisma.article.findMany({
    select: { url: true },
  });
  return new Set(existingArticles.map((a: { url: string }) => a.url));
}

// Function to log scraping statistics
async function logScrapingStats() {
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

// Comprehensive Airbnb Community scraping function
export async function scrapeAirbnbCommunity(): Promise<Article[]> {
  console.log('[SCRAPE][AIRBNB-COMMUNITY] Starting comprehensive Airbnb Community scraping...');
  const articles: Article[] = [];
  try {
    const { createBrowser } = await import('@/utils/puppeteer');
    const browser = await createBrowser();
    console.log('[SCRAPE][AIRBNB-COMMUNITY] Browser created successfully');
    try {
      const communityCategories = [
        'https://community.withairbnb.com/t5/Community-Center/ct-p/community-center',
        'https://community.withairbnb.com/t5/Hosting/ct-p/hosting',
        'https://community.withairbnb.com/t5/Guests/ct-p/guests',
        'https://community.withairbnb.com/t5/Experiences/ct-p/experiences',
      ];
      console.log(`[SCRAPE][AIRBNB-COMMUNITY] Will scrape ${communityCategories.length} categories.`);
      const username = process.env.AIRBNB_USERNAME;
      const password = process.env.AIRBNB_PASSWORD;
      if (username && password) {
        let loginPage: Page | undefined;
        try {
          loginPage = await browser.newPage();
          console.log('[SCRAPE][AIRBNB-COMMUNITY] Navigating to Airbnb login page...');
          await loginPage.goto('https://www.airbnb.com/login', { waitUntil: 'networkidle0' });
          console.log('[SCRAPE][AIRBNB-COMMUNITY] Entering credentials...');
          await loginPage.type('input[name="email"]', username);
          await loginPage.click('button[type="submit"]');
          await loginPage.waitForNavigation({ waitUntil: 'networkidle0' });
          console.log('[SCRAPE][AIRBNB-COMMUNITY] Entering password...');
          await loginPage.type('input[name="password"]', password);
          await loginPage.click('button[type="submit"]');
          await loginPage.waitForNavigation({ waitUntil: 'networkidle0' });
          console.log('[SCRAPE][AIRBNB-COMMUNITY] Login successful!');
        } catch (e) {
          console.error('[SCRAPE][AIRBNB-COMMUNITY] Login failed. Continuing without authentication.', e);
        } finally {
          if (loginPage) {
            await loginPage.close();
            console.log('[SCRAPE][AIRBNB-COMMUNITY] Login page closed.');
          }
        }
      } else {
        console.log('[SCRAPE][AIRBNB-COMMUNITY] Credentials not found, skipping login.');
      }
      for (const categoryUrl of communityCategories) {
        let page: Page | undefined;
        try {
          page = await browser.newPage();
          const activePage = page;
          await activePage.setViewport({ width: 1280, height: 800 });
          await activePage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
          await activePage.setDefaultTimeout(120000);
          await activePage.setRequestInterception(true);
          activePage.on('request', (request) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) request.abort();
            else request.continue();
          });
          activePage.on('dialog', async (dialog) => {
            console.log(`[PUPPETEER] Dismissing dialog: ${dialog.message()}`);
            await dialog.dismiss();
          });
          console.log(`[SCRAPE][AIRBNB-COMMUNITY] Scraping category: ${categoryUrl}`);
          await activePage.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
          const threadLinks = await activePage.$$eval('a[href*="/td-p/"], a[href*="/m-p/"]', (links) =>
            links.map((link: Element) => ({ url: (link as HTMLAnchorElement).href, title: link.textContent?.trim() || '' }))
          );
          if (threadLinks.length === 0) {
            console.log(`[PUPPETEER] No thread links found on ${categoryUrl}. Page might be blocked or empty.`);
          }
          const urlObj = new URL(categoryUrl);
          const pathParts = urlObj.pathname.split('/');
          let categoryName = 'Airbnb Community';
          for (let i = 0; i < pathParts.length; i++) {
            if (pathParts[i] === 't5' && pathParts[i + 1]) {
              categoryName = pathParts[i + 1].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
              break;
            }
          }
          console.log(`[SCRAPE][AIRBNB-COMMUNITY] Found ${threadLinks.length} threads in ${categoryName}`);
          for (const { url, title } of threadLinks) {
            try {
              await activePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
              const extracted = await activePage.evaluate(() => {
                const titleElement = document.querySelector('.lia-message-subject, .page-title, .topic-title, h1, .lia-message-subject-text');
                const contentElements = Array.from(document.querySelectorAll('.lia-message-body-content, .lia-message-body, .lia-message-content'));
                const title = titleElement ? titleElement.textContent?.trim() || '' : '';
                const content = contentElements.map((el) => el.textContent?.trim() || '').join('\n');
                return { title, content };
              });
              if (extracted.title && extracted.content && extracted.content.length > 50) {
                articles.push({ url, question: extracted.title || title, answer: extracted.content, platform: 'Airbnb', category: categoryName, contentType: 'community' });
                console.log(`[SCRAPE][AIRBNB-COMMUNITY] Successfully scraped thread: ${extracted.title}`);
              }
            } catch (error) {
              console.error(`[SCRAPE][AIRBNB-COMMUNITY] Error scraping thread ${url}:`, error);
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`[SCRAPE][AIRBNB-COMMUNITY] Error accessing category ${categoryUrl}:`, error);
        } finally {
          if (page) {
            await page.close();
            console.log(`[SCRAPE][AIRBNB-COMMUNITY] Page closed for category: ${categoryUrl}`);
          }
        }
      }
    } finally {
      await browser.close();
      console.log('[SCRAPE][AIRBNB-COMMUNITY] Browser closed');
    }
  } catch (error) {
    console.error('[SCRAPE][AIRBNB-COMMUNITY] Failed to create browser:', error);
    throw error;
  }
  console.log(`[SCRAPE][AIRBNB-COMMUNITY] Scraping completed. Found ${articles.length} articles`);
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
    console.log(`[SLUG] Could not generate a unique slug for title "${title}". Using fallback: ${slug}`);
  }
  return slug;
}

async function main() {
  try {
    console.log('[SCRAPE] Starting scrape process...');
    await prisma.$connect();
    console.log('[SCRAPE] Database connection successful');
    const existingUrls = await getExistingArticleUrls();
    console.log(`[SCRAPE] Found ${existingUrls.size} existing articles in database`);
    await logScrapingStats();
    
    let allArticles: Article[] = [];
    if (isFeatureEnabled('enableCommunityCrawling')) {
      try {
        const communityArticles = await scrapeAirbnbCommunity();
        allArticles = allArticles.concat(communityArticles);
      } catch (e) {
        console.error('[SCRAPE] Airbnb Community scraper failed catastrophically.', e);
      }
    } else {
      console.log('[SCRAPE] Airbnb Community crawling disabled by feature flag.');
    }

    const officialScrapers = [
      { name: 'Airbnb', scraper: scrapeAirbnb, enabled: true },
      { name: 'GetYourGuide', scraper: crawlGetYourGuideArticlesWithPagination, enabled: isFeatureEnabled('enableGetYourGuidePagination') },
      { name: 'Viator', scraper: crawlViatorArticles, enabled: isFeatureEnabled('enableViatorScraping') },
    ];

    for (const scraper of officialScrapers) {
      if (scraper.enabled) {
        console.log(`\n[SCRAPE] Starting ${scraper.name} scraping...`);
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
          console.error(`[SCRAPE] ${scraper.name} scraping failed:`, e);
        }
      }
    }

    console.log(`\n[SCRAPE] Found a total of ${allArticles.length} articles from all sources.`);

    const newArticles = allArticles.filter(article => !existingUrls.has(article.url));
    console.log(`[SCRAPE] ${newArticles.length} are new articles not yet in the database.`);

    let processedCount = 0, skippedCount = 0, duplicateCount = 0, errorCount = 0;
    
    for (const article of newArticles) {
      if (!validateArticle(article, article.platform).isValid) {
        console.log(`[SCRAPE] Skipping invalid article: ${article.question}`);
        errorCount++;
        continue;
      }
      try {
        const contentHash = generateContentHash(article.answer);
        let isDuplicate = false;
        if (contentHash) {
          const duplicateCheck = await checkContentDuplicate(contentHash);
          if (duplicateCheck.isDuplicate) {
            console.log(`[SCRAPE][DEDUP] Found content duplicate of ${duplicateCheck.existingArticle?.url}.`);
            isDuplicate = true;
            duplicateCount++;
          }
        }
        const languageDetection = detectLanguage(article.answer);
        const slug = await generateUniqueSlug(article.question);
        
        let paragraphsWithEmbeddings: ParagraphWithEmbedding[] = [];
        try {
          paragraphsWithEmbeddings = await getContentEmbeddings(article.answer);
        } catch (embeddingError) {
          console.error('[SCRAPE] Failed to generate embeddings:', embeddingError);
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
        console.log(`[SCRAPE] Successfully processed article: ${article.question}`);
      } catch (articleError: any) {
        console.error(`[SCRAPE] Error processing article "${article.question}" (${article.url}):`);
        console.error(articleError.message); // More detailed error log
        errorCount++;
      }
    }

    console.log(`\n[SCRAPE] Processing summary:`);
    console.log(`[SCRAPE] - New articles processed: ${processedCount}`);
    console.log(`[SCRAPE] - Articles skipped (validation failed or other): ${errorCount}`);
    console.log(`[SCRAPE] - Articles marked as duplicates: ${duplicateCount}`);
    console.log(`[SCRAPE] - Total new articles attempted: ${newArticles.length}`);

    await logScrapingStats();
    console.log('\n[SCRAPE] Scrape process completed successfully');
  } catch (error) {
    console.error('[SCRAPE] Error during scrape:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('[SCRAPE] Database connection closed');
  }
}

main(); 