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

// Simple function to process articles
async function processNewArticles(articles: Article[], existingUrls: Set<string>) {
  const newArticles = articles.filter(article => !existingUrls.has(article.url));
  console.log(`📝 Found ${newArticles.length} new articles to process`);
  
  let processed = 0;
  
  for (const article of newArticles) {
    try {
      // Skip if no content
      if (!article.question || !article.answer || article.answer.length < 50) {
        continue;
      }
      
      const contentHash = generateContentHash(article.answer);
      const isDuplicate = contentHash ? (await checkContentDuplicate(contentHash)).isDuplicate : false;
      
      if (isDuplicate) {
        console.log(`⏭️  Skipping duplicate: ${article.question}`);
        continue;
      }
      
      const languageDetection = detectLanguage(article.answer);
      const slug = await generateUniqueSlug(article.question);
      
      // Create article
      await prisma.article.create({
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
          isDuplicate: false,
          language: languageDetection.language,
        },
      });
      
      // Add embeddings
      try {
        const embeddings = await getContentEmbeddings(article.answer);
        if (embeddings.length > 0) {
          const created = await prisma.article.findUnique({ where: { url: article.url } });
          if (created) {
            await prisma.articleParagraph.createMany({
              data: embeddings.map(p => ({
                articleId: created.id,
                text: p.text,
                embedding: p.embedding,
              })),
            });
          }
        }
      } catch (e) {
        // Skip embeddings if they fail
      }
      
      processed++;
      console.log(`✅ Added: ${article.question}`);
      
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⏭️  URL already exists: ${article.url}`);
      } else {
        console.error(`❌ Error processing: ${error.message}`);
      }
    }
  }
  
  return processed;
}

async function generateUniqueSlug(title: string): Promise<string> {
  let slug = slugify(title);
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${slugify(title)}-${randomBytes(3).toString('hex')}`;
    attempts++;
  }
  return `article-${randomBytes(6).toString('hex')}`;
}

async function collectMoreContent() {
  console.log('🚀 Starting content collection...');
  
  try {
    await prisma.$connect();
    
    const existingArticles = await prisma.article.findMany({ select: { url: true } });
    const existingUrls = new Set(existingArticles.map(a => a.url));
    console.log(`📊 Current database: ${existingUrls.size} articles`);
    
    let totalNew = 0;
    
    // Run working scrapers
    const scrapers = [
      { name: 'Airbnb', scraper: scrapeAirbnb, enabled: true },
      { name: 'GetYourGuide', scraper: crawlGetYourGuideArticlesWithPagination, enabled: true },
      { name: 'Viator', scraper: crawlViatorArticles, enabled: true },
      { name: 'Airbnb Community', scraper: scrapeAirbnbCommunity, enabled: true },
    ];
    
    for (const { name, enabled, scraper } of scrapers) {
      if (!enabled) continue;
      
      console.log(`\n🔍 Running ${name} scraper...`);
      try {
        const articles = await scraper();
        const mappedArticles = articles.map((a: any) => ({
          ...a,
          platform: name,
          contentType: name.includes('Community') ? 'community' : 'official',
          category: a.category || 'Help Center',
        }));
        
        const processed = await processNewArticles(mappedArticles, existingUrls);
        totalNew += processed;
        console.log(`✅ ${name}: Processed ${processed} new articles`);
        
      } catch (error) {
        console.error(`❌ ${name} scraper failed:`, error);
      }
    }
    
    // Final stats
    const finalCount = await prisma.article.count();
    console.log(`\n🎉 FINAL RESULTS:`);
    console.log(`   - New articles added: ${totalNew}`);
    console.log(`   - Total articles in database: ${finalCount}`);
    
    if (totalNew > 0) {
      console.log(`\n✅ SUCCESS: Added ${totalNew} new articles!`);
    } else {
      console.log(`\n⚠️  No new articles found. All sources exhausted.`);
    }
    
  } catch (error) {
    console.error('❌ Collection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

collectMoreContent(); 