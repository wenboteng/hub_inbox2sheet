import { PrismaClient } from '@prisma/client';
import { scrapeAirbnb } from '@/scripts/scrapers/airbnb';
import { crawlGetYourGuideArticlesWithPagination } from '@/crawlers/getyourguide';
import { crawlViatorArticles } from '@/crawlers/viator';
import { scrapeAirbnbCommunity } from './scrape';
import { isFeatureEnabled } from '@/utils/featureFlags';
import { getContentEmbeddings } from '@/utils/openai';
import { generateContentHash, checkContentDuplicate } from '@/utils/contentDeduplication';
import { detectLanguage } from '@/utils/languageDetection';
import { slugify } from '@/utils/slugify';
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

interface ParagraphWithEmbedding {
  text: string;
  embedding: number[];
}

// Generate unique slug
async function generateUniqueSlug(title: string): Promise<string> {
  let slug = slugify(title);
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 5) {
    const existingSlug = await prisma.article.findUnique({ where: { slug } });
    if (existingSlug) {
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
  }
  return slug;
}

// Validate article
function validateArticle(article: Article): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!article.url || article.url.trim() === '') issues.push('Empty or missing URL');
  if (!article.question || article.question.trim() === '') issues.push('Empty or missing question/title');
  if (!article.answer || article.answer.trim() === '') issues.push('Empty or missing answer/content');
  if (article.answer && article.answer.length < 50) issues.push(`Content too short (${article.answer.length} characters)`);
  if (!article.platform || article.platform.trim() === '') issues.push('Empty or missing platform');
  if (!article.category || article.category.trim() === '') issues.push('Empty or missing category');

  return { isValid: issues.length === 0, issues };
}

// Process articles with enhanced error handling and duplicate URL prevention
async function processArticles(articles: Article[], existingUrls: Set<string>) {
  // Remove duplicates by URL first
  const uniqueArticles = articles.filter((article, index, self) => 
    index === self.findIndex(a => a.url === article.url)
  );
  
  const newArticles = uniqueArticles.filter(article => !existingUrls.has(article.url));
  console.log(`[PROCESS] Found ${newArticles.length} unique new articles to process`);
  
  let processedCount = 0, skippedCount = 0, duplicateCount = 0, errorCount = 0;
  
  for (const article of newArticles) {
    if (!validateArticle(article).isValid) {
      console.log(`[PROCESS] Skipping invalid article: ${article.question}`);
      errorCount++;
      continue;
    }
    
    try {
      const contentHash = generateContentHash(article.answer);
      let isDuplicate = false;
      
      if (contentHash) {
        const duplicateCheck = await checkContentDuplicate(contentHash);
        if (duplicateCheck.isDuplicate) {
          console.log(`[PROCESS][DEDUP] Found content duplicate of ${duplicateCheck.existingArticle?.url}.`);
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
        console.error('[PROCESS] Failed to generate embeddings:', embeddingError);
      }

      // Use upsert to handle potential URL conflicts
      const created = await prisma.article.upsert({
        where: { url: article.url },
        update: {
          question: article.question,
          slug: slug,
          answer: article.answer,
          category: article.category,
          platform: article.platform,
          contentType: article.contentType,
          contentHash: contentHash || null,
          isDuplicate: isDuplicate,
          language: languageDetection.language,
        },
        create: {
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
        // Delete existing paragraphs and recreate
        await prisma.articleParagraph.deleteMany({
          where: { articleId: created.id }
        });
        
        await prisma.articleParagraph.createMany({
          data: paragraphsWithEmbeddings.map(p => ({
            articleId: created.id,
            text: p.text,
            embedding: p.embedding,
          })),
        });
      }
      
      processedCount++;
      console.log(`[PROCESS] Successfully processed: ${article.question}`);
    } catch (articleError: any) {
      console.error(`[PROCESS] Error processing article "${article.question}":`, articleError.message);
      errorCount++;
    }
  }
  
  return { processedCount, skippedCount, duplicateCount, errorCount };
}

// Main optimized scraping function
async function optimizedScraping() {
  console.log('[OPTIMIZED-SCRAPE] Starting optimized scraping process...');
  
  try {
    await prisma.$connect();
    console.log('[OPTIMIZED-SCRAPE] Database connected');
    
    const existingArticles = await prisma.article.findMany({ select: { url: true } });
    const existingUrls = new Set(existingArticles.map(a => a.url));
    console.log(`[OPTIMIZED-SCRAPE] Found ${existingUrls.size} existing articles`);
    
    let allArticles: Article[] = [];
    
    // Only run working scrapers (removed Expedia due to DNS issues)
    const workingScrapers = [
      { name: 'Airbnb', scraper: scrapeAirbnb, enabled: true },
      { name: 'GetYourGuide', scraper: crawlGetYourGuideArticlesWithPagination, enabled: isFeatureEnabled('enableGetYourGuidePagination') },
      { name: 'Viator', scraper: crawlViatorArticles, enabled: isFeatureEnabled('enableViatorScraping') },
      { name: 'Airbnb Community', scraper: scrapeAirbnbCommunity, enabled: isFeatureEnabled('enableCommunityCrawling') },
    ];
    
    for (const { name, enabled, scraper } of workingScrapers) {
      if (enabled) {
        console.log(`\n[OPTIMIZED-SCRAPE] Running ${name} scraper...`);
        try {
          const articles = await scraper();
          const mappedArticles = articles.map((a: any) => ({
            ...a,
            platform: name,
            contentType: name.includes('Community') ? 'community' : 'official',
            category: a.category || 'Help Center',
          }));
          allArticles = allArticles.concat(mappedArticles);
          console.log(`[OPTIMIZED-SCRAPE] ${name}: Found ${articles.length} articles`);
        } catch (e) {
          console.error(`[OPTIMIZED-SCRAPE] ${name} scraper failed:`, e);
        }
      }
    }
    
    console.log(`\n[OPTIMIZED-SCRAPE] Total articles found: ${allArticles.length}`);
    
    // Process new articles
    const results = await processArticles(allArticles, existingUrls);
    
    // Summary
    console.log(`\n[OPTIMIZED-SCRAPE] Processing summary:`);
    console.log(`   - New articles processed: ${results.processedCount}`);
    console.log(`   - Articles skipped: ${results.skippedCount}`);
    console.log(`   - Articles marked as duplicates: ${results.duplicateCount}`);
    console.log(`   - Errors: ${results.errorCount}`);
    
    // Final stats
    const finalStats = await prisma.article.groupBy({
      by: ['platform'],
      _count: { id: true },
    });
    
    console.log('\n📊 FINAL DATABASE STATISTICS:');
    finalStats.forEach((stat: { platform: string; _count: { id: number } }) => {
      console.log(`   ${stat.platform}: ${stat._count.id} articles`);
    });
    
    const totalArticles = await prisma.article.count();
    console.log(`\n🎉 Total articles in database: ${totalArticles}`);
    
    if (results.processedCount > 0) {
      console.log(`\n✅ SUCCESS: Added ${results.processedCount} new articles to your database!`);
    } else {
      console.log(`\n⚠️  No new articles found. All sources have been exhausted.`);
      console.log(`💡 Consider:`);
      console.log(`   - Adding more community sources (Reddit, Quora, etc.)`);
      console.log(`   - Implementing content re-checking for updates`);
      console.log(`   - Adding more travel platforms`);
    }
    
  } catch (error) {
    console.error('[OPTIMIZED-SCRAPE] Error during optimized scraping:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('[OPTIMIZED-SCRAPE] Database disconnected');
  }
}

optimizedScraping(); 