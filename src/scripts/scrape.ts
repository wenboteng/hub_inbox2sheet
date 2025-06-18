import { crawlGetYourGuideArticles } from '../crawlers/getyourguide';
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
    const articles = await crawlGetYourGuideArticles();
    
    // Store articles in database
    for (const article of articles) {
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
    
    console.log(`[SCRAPER] Successfully stored ${articles.length} articles in database`);
  } catch (error) {
    console.error('[SCRAPER] Error in scraper script:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 