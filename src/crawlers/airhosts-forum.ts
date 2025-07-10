import puppeteer, { Browser, Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import { createBrowser } from '../utils/puppeteer';

const prisma = new PrismaClient();

// Enhanced AirHosts Forum configuration
const AIRHOSTS_CONFIG = {
  rateLimit: {
    minDelay: 3000,  // Increased from 2000ms
    maxDelay: 6000,  // Increased from 4000ms
  },
  timeouts: {
    navigation: 30000,  // Reduced from 90000ms to 30 seconds
    pageLoad: 20000,    // 20 seconds for page load
    elementWait: 10000, // 10 seconds for element wait
  },
  retryAttempts: 2,
  exponentialBackoff: true,
  maxThreadsPerCategory: 5, // Reduced from 10 to avoid timeouts
};

export interface AirHostsPost {
  platform: 'AirHosts Forum';
  url: string;
  question: string;
  answer: string;
  category?: string;
}

// Helper function to get random delay
function getRandomDelay(): number {
  return Math.floor(
    Math.random() * 
    (AIRHOSTS_CONFIG.rateLimit.maxDelay - AIRHOSTS_CONFIG.rateLimit.minDelay) + 
    AIRHOSTS_CONFIG.rateLimit.minDelay
  );
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced page setup with better error handling
async function setupPage(page: Page): Promise<void> {
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  // Set shorter timeouts
  await page.setDefaultTimeout(AIRHOSTS_CONFIG.timeouts.navigation);
  
  // Block unnecessary resources to speed up loading
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (['image', 'stylesheet', 'font', 'media', 'script'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });
  
  // Handle dialogs
  page.on('dialog', async (dialog) => {
    console.log(`[AIRHOSTS] Dismissing dialog: ${dialog.message()}`);
    await dialog.dismiss();
  });
}

// Enhanced navigation with retry logic
async function navigateWithRetry(page: Page, url: string, attempt = 1): Promise<boolean> {
  try {
    console.log(`[AIRHOSTS] Navigating to ${url} (attempt ${attempt})`);
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', // Changed from 'networkidle0' to 'domcontentloaded'
      timeout: AIRHOSTS_CONFIG.timeouts.navigation 
    });
    
    // Wait a bit for dynamic content
    await delay(2000);
    
    return true;
  } catch (error) {
    console.error(`[AIRHOSTS] Navigation failed for ${url} (attempt ${attempt}):`, error);
    
    if (attempt < AIRHOSTS_CONFIG.retryAttempts) {
      const backoffDelay = AIRHOSTS_CONFIG.exponentialBackoff ? 
        Math.min(5000 * Math.pow(2, attempt), 20000) : 5000;
      console.log(`[AIRHOSTS] Retrying navigation in ${backoffDelay}ms...`);
      await delay(backoffDelay);
      return navigateWithRetry(page, url, attempt + 1);
    }
    
    return false;
  }
}

// Enhanced content extraction with better error handling
async function extractContent(page: Page, url: string): Promise<AirHostsPost | null> {
  try {
    // Wait for content to load with shorter timeout
    await page.waitForSelector('h1, .topic-title, .post-content, .cooked', { 
      timeout: AIRHOSTS_CONFIG.timeouts.elementWait 
    });
    
    const postData = await page.evaluate(() => {
      const titleElement = document.querySelector('h1, .topic-title, .fancy-title');
      const contentElement = document.querySelector('.post-content, .cooked, .topic-body, .content');
      
      if (!titleElement || !contentElement) return null;
      
      const title = titleElement.textContent?.trim() || '';
      const content = contentElement.textContent?.trim() || '';
      
      return {
        title,
        content,
        url: window.location.href
      };
    });
    
    if (postData && postData.title && postData.content && postData.content.length > 100) {
      return {
        url: postData.url,
        question: postData.title,
        answer: postData.content,
        platform: 'AirHosts Forum',
        category: 'Hosting Discussion'
      };
    }
    
    return null;
  } catch (error) {
    console.error(`[AIRHOSTS] Content extraction failed for ${url}:`, error);
    return null;
  }
}

export async function crawlAirHostsForum(): Promise<AirHostsPost[]> {
  console.log('[AIRHOSTS] Starting AirHosts Forum crawling...');
  const posts: AirHostsPost[] = [];
  
  let browser: Browser | null = null;
  
  try {
    browser = await createBrowser();
    const page = await browser.newPage();
    await setupPage(page);
    
    // AirHosts Forum categories to crawl
    const categories = [
      'https://airhostsforum.com/c/hosting-discussions',
      'https://airhostsforum.com/c/guest-issues',
      'https://airhostsforum.com/c/technical-support',
      'https://airhostsforum.com/c/business-advice',
    ];
    
    for (const categoryUrl of categories) {
      try {
        console.log(`[AIRHOSTS] Crawling category: ${categoryUrl}`);
        
        const navigationSuccess = await navigateWithRetry(page, categoryUrl);
        if (!navigationSuccess) {
          console.log(`[AIRHOSTS] Skipping category ${categoryUrl} due to navigation failure`);
          continue;
        }
        
        // Get topic links with shorter timeout
        const topicLinks = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/t/"]'));
          return links.slice(0, 5).map(link => (link as HTMLAnchorElement).href); // Reduced from 10 to 5
        });
        
        console.log(`[AIRHOSTS] Found ${topicLinks.length} topic links in category`);
        
        for (const topicUrl of topicLinks) {
          try {
            const navigationSuccess = await navigateWithRetry(page, topicUrl);
            if (!navigationSuccess) {
              console.log(`[AIRHOSTS] Skipping topic ${topicUrl} due to navigation failure`);
              continue;
            }
            
            const post = await extractContent(page, topicUrl);
            if (post) {
              posts.push(post);
              console.log(`[AIRHOSTS] Successfully extracted: "${post.question}"`);
            }
            
            // Add delay between requests
            await delay(getRandomDelay());
            
          } catch (error) {
            if (error instanceof Error) {
              console.error(`[AIRHOSTS] Error crawling topic ${topicUrl}:`, error.message);
            } else {
              console.error(`[AIRHOSTS] Error crawling topic ${topicUrl}:`, error);
            }
          }
        }
        
        // Add delay between categories
        await delay(getRandomDelay());
        
      } catch (error) {
        if (error instanceof Error) {
          console.error(`[AIRHOSTS] Error crawling category ${categoryUrl}:`, error.message);
        } else {
          console.error(`[AIRHOSTS] Error crawling category ${categoryUrl}:`, error);
        }
      }
    }
    
  } catch (error) {
    if (error instanceof Error) {
      console.error('[AIRHOSTS] Error in AirHosts Forum crawling:', error.message);
    } else {
      console.error('[AIRHOSTS] Error in AirHosts Forum crawling:', error);
    }
  } finally {
    if (browser) {
      await browser.close();
      console.log('[AIRHOSTS] Browser closed');
    }
  }
  
  console.log(`[AIRHOSTS] Found ${posts.length} posts`);
  return posts;
} 