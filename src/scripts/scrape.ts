import { PrismaClient } from '@prisma/client';
import { getContentEmbeddings } from '@/utils/openai';
import { scrapeAirbnb } from '@/scripts/scrapers/airbnb';
import { crawlGetYourGuideArticlesWithPagination, crawlGetYourGuideArticles } from '@/crawlers/getyourguide';
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

async function main() {
  try {
    console.log('[SCRAPE] Starting scrape process...');
    console.log('[SCRAPE] Environment:', process.env.NODE_ENV || 'development');
    console.log('[SCRAPE] Chrome executable path:', process.env.PUPPETEER_EXECUTABLE_PATH || 'not set');

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
    console.log('\n[SCRAPE] Starting Airbnb scraping...');
    let airbnbArticles: Article[] = [];
    try {
      airbnbArticles = await scrapeAirbnb();
      console.log(`[SCRAPE] Airbnb scraping completed. Found ${airbnbArticles.length} articles`);
      
      // Filter out already existing articles
      const newAirbnbArticles = airbnbArticles.filter(article => !existingUrls.has(article.url));
      console.log(`[SCRAPE] New Airbnb articles: ${newAirbnbArticles.length} (${airbnbArticles.length - newAirbnbArticles.length} already exist)`);
      airbnbArticles = newAirbnbArticles;
    } catch (airbnbError) {
      console.error('[SCRAPE] Airbnb scraping failed:', airbnbError);
      // Continue with other scrapers even if Airbnb fails
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
        }));
      } else {
        console.log('[SCRAPE] Using legacy GetYourGuide crawler (no pagination)');
        const crawled = await crawlGetYourGuideArticles();
        gygArticles = crawled.map(a => ({
          ...a,
          category: 'Help Center',
        }));
      }
      
      console.log(`[SCRAPE] GetYourGuide crawling completed. Found ${gygArticles.length} articles`);
      
      // Filter out already existing articles
      const newGygArticles = gygArticles.filter(article => !existingUrls.has(article.url));
      console.log(`[SCRAPE] New GetYourGuide articles: ${newGygArticles.length} (${gygArticles.length - newGygArticles.length} already exist)`);
      gygArticles = newGygArticles;
    } catch (gygError) {
      console.error('[SCRAPE] GetYourGuide crawling failed:', gygError);
      // Continue with other scrapers even if GetYourGuide fails
    }

    // Scrape community content
    if (isFeatureEnabled('enableCommunityCrawling')) {
      console.log('\n[SCRAPE] Starting community content scraping...');
      try {
        const communityUrls = await getCommunityContentUrls();
        console.log(`[SCRAPE] Found ${communityUrls.length} community URLs to scrape`);
        
        // Note: scrapeCommunityUrls handles its own database operations
        // so we don't need to process the results here
        await scrapeCommunityUrls(communityUrls);
        console.log('[SCRAPE] Community content scraping completed');
      } catch (communityError) {
        console.error('[SCRAPE] Community content scraping failed:', communityError);
        // Continue even if community scraping fails
      }
    } else {
      console.log('\n[SCRAPE] Community crawling disabled by feature flag');
    }

    const articles = [...airbnbArticles, ...gygArticles];
    console.log(`\n[SCRAPE] Total new official articles found: ${articles.length}`);

    if (articles.length === 0) {
      console.log('[SCRAPE] No new official articles found, but community content may have been scraped.');
    }

    // Process each new official article
    let processedCount = 0;
    let skippedCount = 0;
    let duplicateCount = 0;
    
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

        // Create new article (no upsert needed since we checked it doesn't exist)
        const created = await prisma.article.create({
          data: {
            url: article.url,
            question: article.question,
            slug: slugify(article.question),
            answer: article.answer,
            category: article.category,
            platform: article.platform,
            contentType: 'official',
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
      }
    }

    console.log(`\n[SCRAPE] Processing summary:`);
    console.log(`[SCRAPE] - New articles processed: ${processedCount}`);
    console.log(`[SCRAPE] - Articles skipped (already existed): ${skippedCount}`);
    console.log(`[SCRAPE] - Articles marked as duplicates: ${duplicateCount}`);
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