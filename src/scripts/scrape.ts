import { scrapeUrls } from '../lib/crawler';

// List of URLs to scrape
const URLs = [
  // GetYourGuide (public support center)
  'https://support.getyourguide.com/s/article/Cancel-a-booking?language=en_US',
  'https://support.getyourguide.com/s/article/Change-travelers-or-date?language=en_US',
  
  // TODO: Add more verified URLs from support.getyourguide.com/s/
  // For now, we're testing with just these two verified URLs
];

async function main() {
  console.log('[SCRAPER] Starting scraper script');
  console.log('[SCRAPER] Testing with verified public support center URLs');
  
  try {
    await scrapeUrls(URLs);
    console.log('[SCRAPER] Scraper script completed successfully');
  } catch (error) {
    console.error('[SCRAPER] Error in scraper script:', error);
    process.exit(1);
  }
}

main(); 