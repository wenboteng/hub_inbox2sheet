import { PrismaClient } from '@prisma/client';
import { getContentEmbeddings } from '@/utils/openai';
import { scrapeAirbnb } from '@/scripts/scrapers/airbnb';
import { crawlGetYourGuideArticles, crawlGetYourGuideArticlesWithPagination } from '@/crawlers/getyourguide';
import { scrapeCommunityUrls, getCommunityContentUrls } from '@/lib/communityCrawler';
import { 
  generateContentHash, 
  checkContentDuplicate, 
  markArticleAsDuplicate,
  getDeduplicationStats,
  DEFAULT_DEDUP_CONFIG 
} from '@/utils/contentDeduplication';
import { isFeatureEnabled, getFeatureFlagsSummary } from '@/utils/featureFlags';
import { detectLanguage } from '@/utils/languageDetection';
import { slugify } from '@/utils/slugify';
import { crawlViatorArticles } from '@/crawlers/viator';

const prisma = new PrismaClient();

// List of URLs to scrape
const URLs = [
  // GetYourGuide supplier help center articles
  'https://supply.getyourguide.support/hc/en-us/articles/13980989354141-Self-canceling-bookings',
  'https://supply.getyourguide.support/hc/en-us/articles/13980989354141-How-do-I-modify-a-booking',
  'https://supply.getyourguide.support/hc/en-us/articles/13980989354141-How-do-I-issue-a-refund'
];

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
    select: { url: true }
  });
  return new Set(existingArticles.map((a: { url: string }) => a.url));
}

// Function to log scraping statistics
async function logScrapingStats() {
  const totalArticles = await prisma.article.count();
  const officialArticles = await prisma.article.count({
    where: { contentType: 'official' }
  });
  const communityArticles = await prisma.article.count({
    where: { contentType: 'community' }
  });
  
  const platformStats = await prisma.article.groupBy({
    by: ['platform'],
    _count: { id: true }
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
  
  if (!article.url || article.url.trim() === '') {
    issues.push('Empty or missing URL');
  }
  
  if (!article.question || article.question.trim() === '') {
    issues.push('Empty or missing question/title');
  }
  
  if (!article.answer || article.answer.trim() === '') {
    issues.push('Empty or missing answer/content');
  }
  
  if (article.answer && article.answer.length < 50) {
    issues.push(`Content too short (${article.answer.length} characters, minimum 50)`);
  }
  
  if (!article.platform || article.platform.trim() === '') {
    issues.push('Empty or missing platform');
  }
  
  if (!article.category || article.category.trim() === '') {
    issues.push('Empty or missing category');
  }
  
  const isValid = issues.length === 0;
  
  if (!isValid) {
    console.log(`[DEBUG][${platform}] Article validation failed for ${article.url}:`);
    issues.forEach(issue => console.log(`[DEBUG][${platform}]   - ${issue}`));
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
      const page = await browser.newPage();
      
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setDefaultTimeout(60000); // Increased timeout
      
      // Enable request interception to block non-essential resources
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Auto-handle dialogs and popups
      page.on('dialog', async dialog => {
        console.log(`[PUPPETEER] Dismissing dialog: ${dialog.message()}`);
        await dialog.dismiss();
      });

      // Function to dismiss cookie banners
      const dismissCookieBanners = async () => {
        const cookieBanners = [
          'button[data-testid="accept-btn"]',
          'button:contains("Accept all")',
          'button:contains("I agree")',
          'button#onetrust-accept-btn-handler',
        ];

        for (const selector of cookieBanners) {
          try {
            if (await page.$(selector)) {
              console.log(`[PUPPETEER] Found cookie banner with selector: ${selector}. Clicking to dismiss.`);
              await page.click(selector);
              await new Promise(r => setTimeout(r, 1000)); // Wait for banner to disappear
              return;
            }
          } catch (e) {
            // Ignore if selector not found
          }
        }
      };

      const communityCategories = [
        'https://community.withairbnb.com/t5/Community-Center/ct-p/community-center',
        'https://community.withairbnb.com/t5/Hosting/ct-p/hosting',
        'https://community.withairbnb.com/t5/Guests/ct-p/guests',
        'https://community.withairbnb.com/t5/Experiences/ct-p/experiences',
      ];
      
      console.log(`[SCRAPE][AIRBNB-COMMUNITY] Will scrape ${communityCategories.length} categories.`);
      
      let totalThreadsFound = 0;
      let totalThreadsProcessed = 0;
      
      const username = process.env.AIRBNB_USERNAME;
      const password = process.env.AIRBNB_PASSWORD;

      // Only attempt login if credentials are provided
      if (username && password) {
        try {
          console.log('[SCRAPE][AIRBNB-COMMUNITY] Navigating to Airbnb login page...');
          await page.goto('https://www.airbnb.com/login', { waitUntil: 'networkidle0' });
  
          console.log('[SCRAPE][AIRBNB-COMMUNITY] Entering credentials...');
          // This selector might need to be adjusted based on the current login form.
          await page.type('input[name="email"]', username);
          await page.click('button[type="submit"]');
          
          await page.waitForNavigation({ waitUntil: 'networkidle0' });
  
          console.log('[SCRAPE][AIRBNB-COMMUNITY] Entering password...');
          await page.type('input[name="password"]', password);
          await page.click('button[type="submit"]');
  
          await page.waitForNavigation({ waitUntil: 'networkidle0' });
          console.log('[SCRAPE][AIRBNB-COMMUNITY] Login successful!');
  
        } catch(e) {
          console.error('[SCRAPE][AIRBNB-COMMUNITY] Login failed. Continuing without authentication.', e);
        }
      } else {
        console.log('[SCRAPE][AIRBNB-COMMUNITY] Credentials not found, skipping login.');
      }

      for (const categoryUrl of communityCategories) {
        try {
          console.log(`[SCRAPE][AIRBNB-COMMUNITY] Scraping category: ${categoryUrl}`);
          await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
          
          await dismissCookieBanners();

          const threadLinks = await page.$$eval('a[href*="/td-p/"], a[href*="/m-p/"]', links =>
            links.map((link: Element) => ({
              url: (link as HTMLAnchorElement).href,
              title: link.textContent?.trim() || '',
            }))
          );

          if (threadLinks.length === 0) {
            console.log(`[PUPPETEER] No thread links found on ${categoryUrl}. The page might be blocked or empty.`);
            console.log('[PUPPETEER] Dumping page HTML for debugging...');
            try {
              const pageContent = await page.content();
              console.log(pageContent);
            } catch (e) {
              console.error('[PUPPETEER] Failed to get page content.', e);
            }
            console.log('[PUPPETEER] End of page HTML dump.');
          }

          // Get category name from URL
          const urlObj = new URL(categoryUrl);
          const pathParts = urlObj.pathname.split('/');
          let categoryName = 'Airbnb Community';
          for (let i = 0; i < pathParts.length; i++) {
            if (pathParts[i] === 't5' && pathParts[i + 1]) {
              categoryName = pathParts[i + 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              break;
            }
          }
          
          console.log(`[SCRAPE][AIRBNB-COMMUNITY] Found ${threadLinks.length} threads in ${categoryName}`);
          totalThreadsFound += threadLinks.length;
          
          // Process each thread (no limit for comprehensive scraping)
          for (const { url, title } of threadLinks) {
            try {
              console.log(`[SCRAPE][AIRBNB-COMMUNITY] Scraping thread: ${title} (${url})`);
              await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

              // Extract thread content
              const extracted = await page.evaluate(() => {
                const titleElement = document.querySelector('.lia-message-subject, .page-title, .topic-title, h1, .lia-message-subject-text');
                const contentElements = Array.from(document.querySelectorAll('.lia-message-body-content, .lia-message-body, .lia-message-content'));
                
                const title = titleElement ? titleElement.textContent?.trim() || '' : '';
                const content = contentElements.map(el => el.textContent?.trim() || '').join('\n');
                
                return { title, content };
              });

              if (extracted.title && extracted.content && extracted.content.length > 50) {
                articles.push({
                  url,
                  question: extracted.title || title,
                  answer: extracted.content,
                  platform: 'Airbnb',
                  category: categoryName,
                  contentType: 'community',
                });
                console.log(`[SCRAPE][AIRBNB-COMMUNITY] Successfully scraped thread: ${extracted.title}`);
                totalThreadsProcessed++;
              } else {
                console.log(`[SCRAPE][AIRBNB-COMMUNITY] Skipping thread with insufficient content: ${title}`);
              }
            } catch (error) {
              console.error(`[SCRAPE][AIRBNB-COMMUNITY] Error scraping thread ${url}:`, error);
            }
            
            // Add delay between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Add delay between categories
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`[SCRAPE][AIRBNB-COMMUNITY] Error accessing category ${categoryUrl}:`, error);
        }
      }
      
      console.log(`[SCRAPE][AIRBNB-COMMUNITY] Comprehensive scraping completed:`);
      console.log(`[SCRAPE][AIRBNB-COMMUNITY] - Total threads found: ${totalThreadsFound}`);
      console.log(`[SCRAPE][AIRBNB-COMMUNITY] - Total threads processed: ${totalThreadsProcessed}`);
      console.log(`[SCRAPE][AIRBNB-COMMUNITY] - Articles collected: ${articles.length}`);

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

async function main() {
  try {
    console.log('[SCRAPE] Starting scrape process...');
    console.log('[SCRAPE] Environment:', process.env.NODE_ENV || 'development');
    console.log('[SCRAPE] Chrome executable path:', process.env.PUPPETEER_EXECUTABLE_PATH || 'not set');
    console.log('[SCRAPE] VERSION: 1.0.2 - Comprehensive Airbnb Community Scraper');
    console.log('[SCRAPE] Build timestamp: 2025-06-21-19:35:00');

    // Test database connection
    try {
      await prisma.$connect();
      console.log('[SCRAPE] Database connection successful');
    } catch (dbError) {
      console.error('[SCRAPE] Database connection failed:', dbError);
      throw dbError;
    }

    // Get existing URLs to avoid duplicates
    const existingUrls = await getExistingArticleUrls();
    console.log(`[SCRAPE] Found ${existingUrls.size} existing articles in database`);

    // Log initial stats
    await logScrapingStats();
    
    // Log feature flags configuration
    console.log(`\n[FEATURE_FLAGS] Feature flags summary: ${getFeatureFlagsSummary()}`);
    
    // Log deduplication configuration
    console.log(`\n[DEDUP] Content deduplication: ${DEFAULT_DEDUP_CONFIG.enabled ? 'ENABLED' : 'DISABLED'}`);
    if (DEFAULT_DEDUP_CONFIG.enabled) {
      console.log(`[DEDUP] Hash algorithm: ${DEFAULT_DEDUP_CONFIG.hashAlgorithm}`);
      console.log(`[DEDUP] Similarity threshold: ${DEFAULT_DEDUP_CONFIG.similarityThreshold}`);
      console.log(`[DEDUP] Min content length: ${DEFAULT_DEDUP_CONFIG.minContentLength}`);
    }

    // Scrape articles from different platforms
    let airbnbArticles: Article[] = [];
    let airbnbCommunityArticles: Article[] = [];
    console.log('\n[SCRAPE] Starting Airbnb scraping...');
    try {
      airbnbArticles = await scrapeAirbnb();
      console.log(`[SCRAPE] Airbnb scraping completed. Found ${airbnbArticles.length} articles`);
      
      // Validate and filter articles
      const validAirbnbArticles = airbnbArticles.filter(article => {
        const validation = validateArticle(article, 'AIRBNB');
        return validation.isValid;
      });
      
      console.log(`[SCRAPE] Valid Airbnb articles: ${validAirbnbArticles.length} (${airbnbArticles.length - validAirbnbArticles.length} invalid)`);
      
      // Filter out already existing articles
      const newAirbnbArticles = validAirbnbArticles.filter(article => !existingUrls.has(article.url));
      console.log(`[SCRAPE] New Airbnb articles: ${newAirbnbArticles.length} (${validAirbnbArticles.length - newAirbnbArticles.length} already exist)`);
      airbnbArticles = newAirbnbArticles;
    } catch (airbnbError) {
      console.error('[SCRAPE] Airbnb scraping failed:', airbnbError);
      // Continue with other scrapers even if Airbnb fails
    }

    // Scrape Airbnb Community content
    if (isFeatureEnabled('enableCommunityCrawling')) {
      console.log('\n[SCRAPE] Starting Airbnb Community scraping (controlled by enableCommunityCrawling flag)...');
      try {
        airbnbCommunityArticles = await scrapeAirbnbCommunity();
        console.log(`[SCRAPE] Airbnb Community scraping completed. Found ${airbnbCommunityArticles.length} articles`);
        
        const validAirbnbCommunityArticles = airbnbCommunityArticles.filter(article => validateArticle(article, 'AIRBNB-COMMUNITY').isValid);
        console.log(`[SCRAPE] Valid Airbnb Community articles: ${validAirbnbCommunityArticles.length}`);
        
        const newAirbnbCommunityArticles = validAirbnbCommunityArticles.filter(article => !existingUrls.has(article.url));
        console.log(`[SCRAPE] New Airbnb Community articles: ${newAirbnbCommunityArticles.length}`);
        airbnbCommunityArticles = newAirbnbCommunityArticles;
      } catch (airbnbCommunityError) {
        console.error('[SCRAPE] Airbnb Community scraping failed:', airbnbCommunityError);
      }
    } else {
      console.log('\n[SCRAPE] Airbnb Community crawling disabled by feature flag.');
    }

    console.log('\n[SCRAPE] Starting GetYourGuide scraping...');
    let gygArticles: Article[] = [];
    try {
      // Use feature flags to determine which crawler to use
      if (isFeatureEnabled('enableGetYourGuidePagination')) {
        console.log('[SCRAPE] Using enhanced GetYourGuide crawler with pagination');
        const crawled = await crawlGetYourGuideArticlesWithPagination();
        gygArticles = crawled.map(a => ({
          ...a,
          category: a.category || 'Help Center',
          contentType: 'official',
        }));
      } else {
        console.log('[SCRAPE] Using legacy GetYourGuide crawler (no pagination)');
        const crawled = await crawlGetYourGuideArticles();
        gygArticles = crawled.map(a => ({
          ...a,
          category: 'Help Center',
          contentType: 'official',
        }));
      }
      
      console.log(`[SCRAPE] GetYourGuide crawling completed. Found ${gygArticles.length} articles`);
      
      // Validate and filter articles
      const validGygArticles = gygArticles.filter(article => {
        const validation = validateArticle(article, 'GETYOURGUIDE');
        return validation.isValid;
      });
      
      console.log(`[SCRAPE] Valid GetYourGuide articles: ${validGygArticles.length} (${gygArticles.length - validGygArticles.length} invalid)`);
      
      // Filter out already existing articles
      const newGygArticles = validGygArticles.filter(article => !existingUrls.has(article.url));
      console.log(`[SCRAPE] New GetYourGuide articles: ${newGygArticles.length} (${validGygArticles.length - newGygArticles.length} already exist)`);
      gygArticles = newGygArticles;
    } catch (gygError) {
      console.error('[SCRAPE] GetYourGuide crawling failed:', gygError);
      // Continue with other scrapers even if GetYourGuide fails
    }

    // Scrape Viator content
    let viatorArticles: Article[] = [];
    if (isFeatureEnabled('enableViatorScraping')) {
      console.log('\n[SCRAPE] Starting Viator scraping...');
      try {
        const crawled = await crawlViatorArticles();
        viatorArticles = crawled.map((a: { question: string; answer: string; url: string; category?: string }) => ({
          ...a,
          platform: 'Viator',
          category: a.category || 'Help Center',
          contentType: 'official',
        }));
        console.log(`[SCRAPE] Viator scraping completed. Found ${viatorArticles.length} articles`);
        
        // Validate and filter articles
        const validViatorArticles = viatorArticles.filter(article => {
          const validation = validateArticle(article, 'VIATOR');
          return validation.isValid;
        });
        
        console.log(`[SCRAPE] Valid Viator articles: ${validViatorArticles.length} (${viatorArticles.length - validViatorArticles.length} invalid)`);
        
        const newViatorArticles = validViatorArticles.filter(article => !existingUrls.has(article.url));
        console.log(`[SCRAPE] New Viator articles: ${newViatorArticles.length} (${validViatorArticles.length - newViatorArticles.length} already exist)`);
        viatorArticles = newViatorArticles;
      } catch (viatorError) {
        console.error('[SCRAPE] Viator scraping failed:', viatorError);
      }
    }

    // Scrape TripAdvisor content
    if (isFeatureEnabled('enableTripAdvisorScraping')) {
      console.log('\n[SCRAPE] TripAdvisor scraping is enabled, but the crawler is not yet implemented.');
      // TODO: Implement TripAdvisor scraper
    }

    // Scrape community content
    if (isFeatureEnabled('enableCommunityCrawling')) {
      console.log('\n[SCRAPE] Community crawling is enabled, but skipping generic community crawler to avoid conflicts with comprehensive Airbnb community scraper');
      console.log('[SCRAPE] Airbnb community content is being handled by the dedicated Airbnb community scraper above');
      // Note: We're skipping the generic community crawler to avoid conflicts
      // The comprehensive Airbnb community scraper above handles all Airbnb community content
    } else {
      console.log('\n[SCRAPE] Community crawling disabled by feature flag');
    }

    const articles = [...airbnbArticles, ...airbnbCommunityArticles, ...gygArticles, ...viatorArticles];
    console.log(`\n[SCRAPE] Total new official articles found: ${articles.length}`);

    if (articles.length === 0) {
      console.log('[SCRAPE] No new official articles found, but community content may have been scraped.');
      console.log('[SCRAPE] This could be due to:');
      console.log('[SCRAPE] 1. All articles already exist in database');
      console.log('[SCRAPE] 2. Crawlers failed to extract valid content');
      console.log('[SCRAPE] 3. Websites changed their structure');
      console.log('[SCRAPE] 4. Rate limiting or blocking');
    }

    // Process each new official article
    let processedCount = 0;
    let skippedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    
    for (const article of articles) {
      try {
        // Double-check if article exists (in case it was added during this run)
        const existing = await prisma.article.findUnique({ where: { url: article.url } });
        if (existing) {
          console.log(`[SCRAPE] Skipping already processed article: ${article.question}`);
          skippedCount++;
          continue;
        }
        
        console.log(`[SCRAPE] Processing new article: ${article.question}`);
        console.log(`[SCRAPE] URL: ${article.url}`);
        console.log(`[SCRAPE] Platform: ${article.platform}`);
        console.log(`[SCRAPE] Content length: ${article.answer.length} characters`);

        // Generate content hash for deduplication
        const contentHash = generateContentHash(article.answer);
        let isDuplicate = false;
        
        if (contentHash) {
          // Check for content duplicates
          const duplicateCheck = await checkContentDuplicate(contentHash);
          if (duplicateCheck.isDuplicate) {
            console.log(`[SCRAPE][DEDUP] Found content duplicate: ${duplicateCheck.existingArticle?.url}`);
            console.log(`[SCRAPE][DEDUP] Original: ${duplicateCheck.existingArticle?.question}`);
            console.log(`[SCRAPE][DEDUP] Duplicate: ${article.question}`);
            isDuplicate = true;
            duplicateCount++;
          }
        }

        // Detect language of the content
        const languageDetection = detectLanguage(article.answer);
        console.log(`[SCRAPE][LANG] Detected language: ${languageDetection.language} (confidence: ${languageDetection.confidence.toFixed(2)}, reliable: ${languageDetection.isReliable})`);

        // Generate embeddings for paragraphs
        let paragraphsWithEmbeddings: ParagraphWithEmbedding[] = [];
        try {
          paragraphsWithEmbeddings = await getContentEmbeddings(article.answer);
          console.log(`[SCRAPE] Generated embeddings for ${paragraphsWithEmbeddings.length} paragraphs`);
        } catch (embeddingError) {
          console.error('[SCRAPE] Failed to generate embeddings:', embeddingError);
          // Continue without embeddings
        }

        // Generate slug and check for duplicates
        const generatedSlug = slugify(article.question);
        console.log(`[SCRAPE] Generated slug: ${generatedSlug}`);
        
        // Check if slug already exists
        const existingSlug = await prisma.article.findUnique({ where: { slug: generatedSlug } });
        if (existingSlug) {
          console.log(`[SCRAPE] Slug conflict detected: ${generatedSlug} already exists`);
          console.log(`[SCRAPE] Existing article: ${existingSlug.question} (${existingSlug.url})`);
          console.log(`[SCRAPE] New article: ${article.question} (${article.url})`);
          // Skip this article to avoid slug conflicts
          errorCount++;
          continue;
        }

        // Create new article (no upsert needed since we checked it doesn't exist)
        const created = await prisma.article.create({
          data: {
            url: article.url,
            question: article.question,
            slug: generatedSlug,
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

        console.log(`[SCRAPE] Article created with ID: ${created.id}${isDuplicate ? ' (marked as duplicate)' : ''} [Language: ${languageDetection.language}]`);

        // Create paragraphs if embeddings were generated
        if (paragraphsWithEmbeddings.length > 0) {
          await prisma.articleParagraph.createMany({
            data: paragraphsWithEmbeddings.map(p => ({
              articleId: created.id,
              text: p.text,
              embedding: p.embedding,
            })),
          });
          console.log(`[SCRAPE] Created ${paragraphsWithEmbeddings.length} paragraph embeddings`);
        }

        processedCount++;
        console.log(`[SCRAPE] Successfully processed article: ${article.question}`);
      } catch (articleError) {
        console.error(`[SCRAPE] Error processing article ${article.url}:`, articleError);
        errorCount++;
      }
    }

    console.log(`\n[SCRAPE] Processing summary:`);
    console.log(`[SCRAPE] - New articles processed: ${processedCount}`);
    console.log(`[SCRAPE] - Articles skipped (already existed): ${skippedCount}`);
    console.log(`[SCRAPE] - Articles marked as duplicates: ${duplicateCount}`);
    console.log(`[SCRAPE] - Articles with errors: ${errorCount}`);
    console.log(`[SCRAPE] - Total articles in this run: ${articles.length}`);

    // Log final stats including deduplication
    await logScrapingStats();
    
    // Log deduplication statistics
    if (DEFAULT_DEDUP_CONFIG.enabled) {
      const dedupStats = await getDeduplicationStats();
      console.log(`\n[DEDUP] Deduplication Statistics:`);
      console.log(`[DEDUP] - Total articles: ${dedupStats.totalArticles}`);
      console.log(`[DEDUP] - Duplicate articles: ${dedupStats.duplicateArticles}`);
      console.log(`[DEDUP] - Unique articles: ${dedupStats.uniqueArticles}`);
      console.log(`[DEDUP] - Duplicate percentage: ${dedupStats.duplicatePercentage.toFixed(2)}%`);
    }

    console.log('\n[SCRAPE] Scrape process completed successfully');
  } catch (error) {
    console.error('[SCRAPE] Error during scrape:', error);
    process.exit(1);
  } finally {
    try {
      await prisma.$disconnect();
      console.log('[SCRAPE] Database connection closed');
    } catch (disconnectError) {
      console.error('[SCRAPE] Error disconnecting from database:', disconnectError);
    }
  }
}

main(); 