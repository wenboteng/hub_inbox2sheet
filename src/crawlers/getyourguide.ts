import axios from 'axios';
import * as cheerio from 'cheerio';

// Public GetYourGuide help center articles
const PUBLIC_URLS = [
  'https://support.getyourguide.com/s/article/Cancel-a-booking?language=en_US',
  'https://support.getyourguide.com/s/article/Change-travelers-or-date?language=en_US',
  'https://support.getyourguide.com/s/article/How-do-I-get-a-refund?language=en_US'
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

// Soft-404 detection
function isSoft404(title: string, content: string): boolean {
  const soft404Indicators = [
    'Hi, how can we help?',
    'Page not found',
    '404',
    'Not Found',
    'Help Center',
    'Search'
  ];
  
  return (
    soft404Indicators.some(indicator => title.includes(indicator)) ||
    content.length < 50 ||
    !content.trim()
  );
}

export async function crawlGetYourGuideArticle(url: string): Promise<GetYourGuideArticle | null> {
  console.log(`[GETYOURGUIDE] Crawling ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: 10000,
    });

    if (response.status !== 200) {
      console.warn(`[GETYOURGUIDE][WARN] Non-200 status code (${response.status}) for ${url}`);
      return null;
    }

    const $ = cheerio.load(response.data);
    
    // Extract title and content from public help center
    const title = $('h1').first().text().trim();
    const content = $('.article-content, .content').first().text().trim();
    
    // Basic validation
    if (!title || !content || content.length < 50) {
      console.warn(`[GETYOURGUIDE][WARN] Invalid content for ${url}`);
      console.warn(`[GETYOURGUIDE][WARN] Title: "${title}"`);
      console.warn(`[GETYOURGUIDE][WARN] Content length: ${content.length}`);
      return null;
    }

    return {
      platform: 'GetYourGuide',
      url,
      question: title,
      answer: content,
    };
  } catch (error) {
    console.error(`[GETYOURGUIDE] Error crawling ${url}:`, error);
    return null;
  }
}

export async function crawlGetYourGuideArticles(urls: string[] = PUBLIC_URLS): Promise<GetYourGuideArticle[]> {
  console.log('[GETYOURGUIDE] Starting crawl of public help center articles');
  
  const results: GetYourGuideArticle[] = [];
  
  for (const url of urls) {
    try {
      const article = await crawlGetYourGuideArticle(url);
      if (article) {
        results.push(article);
        console.log(`[GETYOURGUIDE] Successfully crawled: ${url}`);
        console.log(`[GETYOURGUIDE] Title: ${article.question}`);
        console.log(`[GETYOURGUIDE] Content length: ${article.answer.length} characters`);
      }
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[GETYOURGUIDE] Failed to crawl ${url}:`, error);
    }
  }
  
  console.log(`[GETYOURGUIDE] Completed crawl of ${results.length} articles`);
  return results;
} 