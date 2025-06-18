import axios from 'axios';
import * as cheerio from 'cheerio';

// Test URLs
const TEST_URLS = [
  'https://support.getyourguide.com/s/article/Cancel-a-booking?language=en_US',
  'https://support.getyourguide.com/s/article/Change-travelers-or-date?language=en_US'
];

export interface GetYourGuideArticle {
  platform: 'GetYourGuide';
  url: string;
  question: string;
  answer: string;
}

// Basic browser headers to avoid being blocked
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

export async function crawlGetYourGuideArticle(url: string): Promise<GetYourGuideArticle> {
  console.log(`[GETYOURGUIDE] Crawling ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: 10000,
    });

    if (response.status !== 200) {
      throw new Error(`Non-200 status code: ${response.status}`);
    }

    const $ = cheerio.load(response.data);
    
    // Extract title and content
    const title = $('h1').first().text().trim();
    const content = $('.article-content, .content').first().text().trim();
    
    if (!title || !content) {
      throw new Error('Missing title or content');
    }

    return {
      platform: 'GetYourGuide',
      url,
      question: title,
      answer: content,
    };
  } catch (error) {
    console.error(`[GETYOURGUIDE] Error crawling ${url}:`, error);
    throw error;
  }
}

export async function crawlGetYourGuideArticles(urls: string[] = TEST_URLS): Promise<GetYourGuideArticle[]> {
  console.log('[GETYOURGUIDE] Starting crawl of articles');
  
  const results: GetYourGuideArticle[] = [];
  
  for (const url of urls) {
    try {
      const article = await crawlGetYourGuideArticle(url);
      results.push(article);
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[GETYOURGUIDE] Failed to crawl ${url}:`, error);
    }
  }
  
  console.log(`[GETYOURGUIDE] Completed crawl of ${results.length} articles`);
  return results;
} 