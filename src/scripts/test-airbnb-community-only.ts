import { PrismaClient } from '@prisma/client';
import { scrapeAirbnbCommunity } from './scrape';

interface Article {
  url: string;
  question: string;
  answer: string;
  platform: string;
  category: string;
}

const prisma = new PrismaClient();

async function testAirbnbCommunityOnly() {
  try {
    console.log('[TEST] Starting Airbnb Community scraping test...');
    console.log('[TEST] Environment:', process.env.NODE_ENV || 'development');
    
    // Test database connection
    try {
      await prisma.$connect();
      console.log('[TEST] Database connection successful');
    } catch (dbError) {
      console.error('[TEST] Database connection failed:', dbError);
      throw dbError;
    }

    // Get existing URLs to avoid duplicates
    const existingArticles = await prisma.article.findMany({
      select: { url: true }
    });
    const existingUrls = new Set(existingArticles.map((a: { url: string }) => a.url));
    console.log(`[TEST] Found ${existingUrls.size} existing articles in database`);

    console.log('\n[TEST] Starting Airbnb Community scraping...');
    
    // Run only the Airbnb community scraping
    const airbnbCommunityArticles = await scrapeAirbnbCommunity();
    console.log(`[TEST] Airbnb Community scraping completed. Found ${airbnbCommunityArticles.length} articles`);
    
    // Filter out already existing articles
    const newArticles = airbnbCommunityArticles.filter((article: Article) => !existingUrls.has(article.url));
    console.log(`[TEST] New articles: ${newArticles.length} (${airbnbCommunityArticles.length - newArticles.length} already exist)`);
    
    // Show sample of found articles
    if (newArticles.length > 0) {
      console.log('\n[TEST] Sample of new articles found:');
      newArticles.slice(0, 5).forEach((article: Article, index: number) => {
        console.log(`[TEST] ${index + 1}. ${article.question}`);
        console.log(`[TEST]    URL: ${article.url}`);
        console.log(`[TEST]    Platform: ${article.platform}`);
        console.log(`[TEST]    Content length: ${article.answer.length} characters`);
        console.log(`[TEST]    Category: ${article.category}`);
        console.log('');
      });
      
      if (newArticles.length > 5) {
        console.log(`[TEST] ... and ${newArticles.length - 5} more articles`);
      }
    } else {
      console.log('[TEST] No new articles found (all may already exist in database)');
    }

    console.log('\n[TEST] Airbnb Community scraping test completed successfully');
    
  } catch (error) {
    console.error('[TEST] Error during Airbnb Community scraping test:', error);
    process.exit(1);
  } finally {
    try {
      await prisma.$disconnect();
      console.log('[TEST] Database connection closed');
    } catch (disconnectError) {
      console.error('[TEST] Error disconnecting from database:', disconnectError);
    }
  }
}

testAirbnbCommunityOnly(); 