import { createBrowser } from '@/utils/puppeteer';
import type { Page } from 'puppeteer';

interface BookingArticle {
  url: string;
  question: string;
  answer: string;
  platform: string;
  category: string;
}

export async function crawlBooking(): Promise<BookingArticle[]> {
  console.log('[BOOKING] Starting Booking.com crawling...');
  const articles: BookingArticle[] = [];
  
  try {
    const browser = await createBrowser();
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Booking.com help center categories
    const helpCategories = [
      'https://www.booking.com/content/help.html',
      'https://www.booking.com/content/help/booking.html',
      'https://www.booking.com/content/help/payment.html',
      'https://www.booking.com/content/help/cancellation.html',
    ];
    
    for (const categoryUrl of helpCategories) {
      try {
        console.log(`[BOOKING] Crawling category: ${categoryUrl}`);
        await page.goto(categoryUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Get article links
        const articleLinks = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/help/"]'));
          return links.slice(0, 15).map(link => (link as HTMLAnchorElement).href);
        });
        
        for (const articleUrl of articleLinks) {
          try {
            await page.goto(articleUrl, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const articleData = await page.evaluate(() => {
              const titleElement = document.querySelector('h1, .help-article-title');
              const contentElement = document.querySelector('.help-article-content, .content');
              
              if (!titleElement || !contentElement) return null;
              
              const title = titleElement.textContent?.trim() || '';
              const content = contentElement.textContent?.trim() || '';
              
              return {
                title,
                content,
                url: window.location.href
              };
            });
            
            if (articleData && articleData.title && articleData.content && articleData.content.length > 100) {
              articles.push({
                url: articleData.url,
                question: articleData.title,
                answer: articleData.content,
                platform: 'Booking.com',
                category: 'Help Center'
              });
            }
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } catch (error) {
            console.error(`[BOOKING] Error crawling article ${articleUrl}:`, error);
          }
        }
        
      } catch (error) {
        console.error(`[BOOKING] Error crawling category ${categoryUrl}:`, error);
      }
    }
    
    await browser.close();
    
  } catch (error) {
    console.error('[BOOKING] Error in Booking.com crawling:', error);
  }
  
  console.log(`[BOOKING] Found ${articles.length} articles`);
  return articles;
} 