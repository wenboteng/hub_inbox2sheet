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

// Enhanced URL discovery with working sources
async function discoverWorkingUrls(): Promise<string[]> {
  console.log('[DISCOVERY] Starting enhanced URL discovery...');
  const discoveredUrls = new Set<string>();
  
  // Working sources that we know exist
  const workingSources = [
    'https://www.airbnb.com/help',
    'https://supply.getyourguide.support/hc/en-us',
    'https://www.viator.com/help/',
    'https://community.withairbnb.com',
  ];
  
  // Additional community sources
  const communitySources = [
    'https://www.reddit.com/r/AirBnB/',
    'https://www.reddit.com/r/travel/',
    'https://www.quora.com/topic/Airbnb',
    'https://www.quora.com/topic/Travel',
    'https://airhostsforum.com',
  ];
  
  for (const source of [...workingSources, ...communitySources]) {
    try {
      console.log(`[DISCOVERY] Exploring ${source}...`);
      const response = await fetch(source, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const html = await response.text();
        const urlRegex = /href=["']([^"']+)["']/g;
        let match;
        
        while ((match = urlRegex.exec(html)) !== null) {
          const href = match[1];
          if (href && (href.includes('help') || href.includes('article') || href.includes('community'))) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, source).toString();
            if (fullUrl.includes('airbnb.com') || fullUrl.includes('getyourguide.com') || 
                fullUrl.includes('viator.com') || fullUrl.includes('reddit.com') || 
                fullUrl.includes('quora.com') || fullUrl.includes('airhostsforum.com')) {
              discoveredUrls.add(fullUrl);
            }
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

// Process articles with enhanced error handling
async function processArticles(articles: Article[], existingUrls: Set<string>) {
  const newArticles = articles.filter(article => !existingUrls.has(article.url));
  console.log(`[PROCESS] Found ${newArticles.length} new articles to process`);
  
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
      console.log(`[PROCESS] Successfully processed: ${article.question}`);
    } catch (articleError: any) {
      console.error(`[PROCESS] Error processing article "${article.question}":`, articleError.message);
      errorCount++;
    }
  }
  
  return { processedCount, skippedCount, duplicateCount, errorCount };
}

// Main enhanced scraping function
async function enhancedScraping() {
  console.log('[ENHANCED-SCRAPE] Starting enhanced scraping process...');
  
  try {
    await prisma.$connect();
    console.log('[ENHANCED-SCRAPE] Database connected');
    
    const existingArticles = await prisma.article.findMany({ select: { url: true } });
    const existingUrls = new Set(existingArticles.map(a => a.url));
    console.log(`[ENHANCED-SCRAPE] Found ${existingUrls.size} existing articles`);
    
    let allArticles: Article[] = [];
    
    // 1. Dynamic URL discovery
    try {
      const discoveredUrls = await discoverWorkingUrls();
      console.log(`[ENHANCED-SCRAPE] Discovered ${discoveredUrls.length} potential URLs`);
    } catch (e) {
      console.error('[ENHANCED-SCRAPE] URL discovery failed:', e);
    }
    
    // 2. Run working scrapers
    const scrapers = [
      { name: 'Airbnb', scraper: scrapeAirbnb, enabled: true },
      { name: 'GetYourGuide', scraper: crawlGetYourGuideArticlesWithPagination, enabled: isFeatureEnabled('enableGetYourGuidePagination') },
      { name: 'Viator', scraper: crawlViatorArticles, enabled: isFeatureEnabled('enableViatorScraping') },
      { name: 'Airbnb Community', scraper: scrapeAirbnbCommunity, enabled: isFeatureEnabled('enableCommunityCrawling') },
    ];
    
    for (const { name, enabled, scraper } of scrapers) {
      if (enabled) {
        console.log(`\n[ENHANCED-SCRAPE] Running ${name} scraper...`);
        try {
          const articles = await scraper();
          const mappedArticles = articles.map((a: any) => ({
            ...a,
            platform: name,
            contentType: name.includes('Community') ? 'community' : 'official',
            category: a.category || 'Help Center',
          }));
          allArticles = allArticles.concat(mappedArticles);
          console.log(`[ENHANCED-SCRAPE] ${name}: Found ${articles.length} articles`);
        } catch (e) {
          console.error(`[ENHANCED-SCRAPE] ${name} scraper failed:`, e);
        }
      }
    }
    
    console.log(`\n[ENHANCED-SCRAPE] Total articles found: ${allArticles.length}`);
    
    // 3. Process new articles
    const results = await processArticles(allArticles, existingUrls);
    
    // 4. Summary
    console.log(`\n[ENHANCED-SCRAPE] Processing summary:`);
    console.log(`   - New articles processed: ${results.processedCount}`);
    console.log(`   - Articles skipped: ${results.skippedCount}`);
    console.log(`   - Articles marked as duplicates: ${results.duplicateCount}`);
    console.log(`   - Errors: ${results.errorCount}`);
    
    // 5. Final stats
    const finalStats = await prisma.article.groupBy({
      by: ['platform'],
      _count: { id: true },
    });
    
    console.log('\n📊 FINAL DATABASE STATISTICS:');
    finalStats.forEach((stat: { platform: string; _count: { id: number } }) => {
      console.log(`   ${stat.platform}: ${stat._count.id} articles`);
    });
    
    console.log('\n[ENHANCED-SCRAPE] Enhanced scraping completed successfully!');
    
  } catch (error) {
    console.error('[ENHANCED-SCRAPE] Error during enhanced scraping:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('[ENHANCED-SCRAPE] Database disconnected');
  }
}

enhancedScraping(); 