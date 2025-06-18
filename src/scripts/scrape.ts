import { crawlGetYourGuideArticles } from '../crawlers/getyourguide';
import { crawlAirbnbArticles } from '../crawlers/airbnb';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List of URLs to scrape
const URLs = [
  // GetYourGuide supplier help center articles
  'https://supply.getyourguide.support/hc/en-us/articles/13980989354141-Self-canceling-bookings',
  'https://supply.getyourguide.support/hc/en-us/articles/13980989354141-How-do-I-modify-a-booking',
  'https://supply.getyourguide.support/hc/en-us/articles/13980989354141-How-do-I-issue-a-refund'
];

async function main() {
  console.log('[SCRAPER] Starting scraper script');
  
  try {
    // Crawl GetYourGuide articles
    console.log('[SCRAPER] Crawling GetYourGuide help center articles');
    const gygArticles = await crawlGetYourGuideArticles();
    
    // Store GetYourGuide articles in database
    for (const article of gygArticles) {
      await prisma.article.upsert({
        where: {
          url: article.url
        },
        update: {
          question: article.question,
          answer: article.answer,
          platform: article.platform,
          lastUpdated: new Date()
        },
        create: {
          url: article.url,
          question: article.question,
          answer: article.answer,
          platform: article.platform,
          lastUpdated: new Date()
        }
      });
    }
    
    console.log(`[SCRAPER] Successfully stored ${gygArticles.length} GetYourGuide articles in database`);

    // Crawl Airbnb articles
    console.log('[SCRAPER] Crawling Airbnb help center articles');
    const airbnbArticles = await crawlAirbnbArticles();
    
    // Store Airbnb articles in database
    for (const article of airbnbArticles) {
      await prisma.article.upsert({
        where: {
          url: article.url
        },
        update: {
          question: article.question,
          answer: article.answer,
          platform: article.platform,
          lastUpdated: new Date()
        },
        create: {
          url: article.url,
          question: article.question,
          answer: article.answer,
          platform: article.platform,
          lastUpdated: new Date()
        }
      });
    }
    
    console.log(`[SCRAPER] Successfully stored ${airbnbArticles.length} Airbnb articles in database`);
    console.log(`[SCRAPER] Total articles stored: ${gygArticles.length + airbnbArticles.length}`);
  } catch (error) {
    console.error('[SCRAPER] Error in scraper script:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 