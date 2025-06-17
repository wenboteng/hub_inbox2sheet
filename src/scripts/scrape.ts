import { scrapeUrls } from '../lib/crawler';

// List of URLs to scrape
const URLs = [
  // Airbnb
  'https://www.airbnb.com/help/article/123',
  'https://www.airbnb.com/help/article/456',
  
  // Booking.com
  'https://partner.booking.com/en-us/help/article/789',
  'https://partner.booking.com/en-us/help/article/012',
  
  // GetYourGuide
  'https://supplier.getyourguide.com/help/article/345',
  'https://supplier.getyourguide.com/help/article/678',
  
  // Expedia
  'https://apps.expediapartnercentral.com/help/article/901',
  'https://apps.expediapartnercentral.com/help/article/234',
];

async function main() {
  console.log('[SCRAPER] Starting scraper script');
  
  try {
    await scrapeUrls(URLs);
    console.log('[SCRAPER] Scraper script completed successfully');
  } catch (error) {
    console.error('[SCRAPER] Error in scraper script:', error);
    process.exit(1);
  }
}

main(); 