import { crawlGetYourGuideArticles } from '../crawlers/getyourguide';

// List of URLs to scrape
const URLs = [
  // GetYourGuide supplier help center articles
  'https://supply.getyourguide.support/hc/en-us/articles/360016791880-How-do-I-cancel-a-booking-',
  'https://supply.getyourguide.support/hc/en-us/articles/360016792120-How-do-I-modify-a-booking-',
  'https://supply.getyourguide.support/hc/en-us/articles/360016792140-How-do-I-issue-a-refund-'
];

async function main() {
  console.log('[SCRAPER] Starting scraper script');
  console.log('[SCRAPER] Testing with verified supplier help center URLs');
  
  try {
    const articles = await crawlGetYourGuideArticles();
    console.log(`[SCRAPER] Successfully crawled ${articles.length} articles`);
  } catch (error) {
    console.error('[SCRAPER] Error in scraper script:', error);
    process.exit(1);
  }
}

main(); 