import { createBrowser } from '../../utils/puppeteer';

interface Article {
  url: string;
  question: string;
  answer: string;
  platform: string;
  category: string;
}

// List of known Airbnb help articles to scrape
const AIRBNB_ARTICLES = [
  'https://www.airbnb.com/help/article/123',
  'https://www.airbnb.com/help/article/456',
  'https://www.airbnb.com/help/article/789',
  // Add more specific article URLs as needed
];

export async function scrapeAirbnb(): Promise<Article[]> {
  console.log('[AIRBNB] Starting Airbnb scraping...');
  const articles: Article[] = [];
  
  try {
    const browser = await createBrowser();
    console.log('[AIRBNB] Browser created successfully');

    try {
      const page = await browser.newPage();
      
      // Set a reasonable timeout and user agent
      await page.setDefaultTimeout(30000);
      await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Try to scrape from the main help center first
      try {
        console.log('[AIRBNB] Attempting to scrape from main help center...');
        await page.goto('https://www.airbnb.com/help', { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Get all article links
        const articleLinks = await page.$$eval('a[href*="/help/article/"]', links =>
          links.map(link => ({
            url: link.href,
            title: link.textContent?.trim() || '',
          }))
        );

        console.log(`[AIRBNB] Found ${articleLinks.length} article links`);

        // Process each article (limit to first 5 for testing)
        for (const { url, title } of articleLinks.slice(0, 5)) {
          try {
            console.log(`[AIRBNB] Scraping article: ${title}`);
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

            // Wait for content to load
            await page.waitForSelector('article, .article-content, .help-content', { timeout: 10000 });

            // Extract article content
            const content = await page.$eval('article, .article-content, .help-content', el => el.textContent?.trim() || '');

            // Get category from breadcrumb or default
            let category = 'Help Center';
            try {
              category = await page.$eval('.breadcrumb, .breadcrumbs', el => 
                el.textContent?.split('>').pop()?.trim() || 'Help Center'
              );
            } catch (e) {
              console.log('[AIRBNB] Could not extract category, using default');
            }

            if (content && content.length > 50) {
              articles.push({
                url,
                question: title || 'Airbnb Help Article',
                answer: content,
                platform: 'Airbnb',
                category,
              });
              console.log(`[AIRBNB] Successfully scraped article: ${title}`);
            } else {
              console.log(`[AIRBNB] Skipping article with insufficient content: ${title}`);
            }
          } catch (error) {
            console.error(`[AIRBNB] Error scraping article ${url}:`, error);
          }
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error('[AIRBNB] Error accessing main help center:', error);
      }

      // If no articles found, try scraping some known articles
      if (articles.length === 0) {
        console.log('[AIRBNB] No articles found from main page, trying known articles...');
        
        for (const url of AIRBNB_ARTICLES.slice(0, 3)) {
          try {
            console.log(`[AIRBNB] Trying known article: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
            
            // Try to extract any content
            const title = await page.title();
            const content = await page.$eval('body', el => el.textContent?.trim() || '');
            
            if (content && content.length > 100) {
              articles.push({
                url,
                question: title || 'Airbnb Help Article',
                answer: content.substring(0, 1000), // Limit content length
                platform: 'Airbnb',
                category: 'Help Center',
              });
              console.log(`[AIRBNB] Successfully scraped known article: ${title}`);
            }
          } catch (error) {
            console.error(`[AIRBNB] Error scraping known article ${url}:`, error);
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

    } finally {
      await browser.close();
      console.log('[AIRBNB] Browser closed');
    }
  } catch (error) {
    console.error('[AIRBNB] Failed to create browser:', error);
    throw error; // Re-throw to let the main script handle it
  }

  console.log(`[AIRBNB] Scraping completed. Found ${articles.length} articles`);
  return articles;
} 