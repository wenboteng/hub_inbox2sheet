import axios from 'axios';
import * as cheerio from 'cheerio';

// Base URL for GetYourGuide supplier help center
const BASE_URL = 'https://supply.getyourguide.support';

// Verified GetYourGuide supplier help center articles and categories
const VERIFIED_URLS = [
  'https://supply.getyourguide.support/hc/en-us/articles/13980989354141',
  'https://supply.getyourguide.support/hc/en-us/categories/13013952719901-Suppliers-FAQs'
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

// Extract article links from a category page
async function extractArticleLinks(url: string): Promise<string[]> {
  console.log(`[GETYOURGUIDE] Extracting article links from ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        ...BROWSER_HEADERS,
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status === 200
    });

    const $ = cheerio.load(response.data);
    const links: string[] = [];

    // Find all article links
    $('a[href*="/articles/"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && !href.includes('#')) {
        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        if (!links.includes(fullUrl)) {
          links.push(fullUrl);
        }
      }
    });

    console.log(`[GETYOURGUIDE] Found ${links.length} article links in ${url}`);
    return links;
  } catch (error) {
    console.error(`[GETYOURGUIDE][ERROR] Failed to extract article links from ${url}:`, error);
    return [];
  }
}

export async function crawlGetYourGuideArticle(url: string): Promise<GetYourGuideArticle | null> {
  if (!url.startsWith('https://supply.getyourguide.support/')) {
    console.error(`[GETYOURGUIDE][ERROR] Invalid domain. Only supply.getyourguide.support is allowed: ${url}`);
    return null;
  }

  console.log(`[GETYOURGUIDE] Crawling ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        ...BROWSER_HEADERS,
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status === 200
    });

    const $ = cheerio.load(response.data);
    
    // Try multiple selectors for title and content
    const title = $('h1, .article-title, .title-text, .article__title, .lt-article__title').first().text().trim();
    const content = $('#main-content, .article-body, .article-content, main article, .article__content, .lt-article__content').first().text().trim();
    
    // Log raw HTML for debugging if no content found
    if (!content) {
      console.warn(`[GETYOURGUIDE][WARN] No content found. Raw HTML snippet:`);
      console.warn(response.data.substring(0, 500) + '...');
      
      // Try to find any text content
      const bodyText = $('body').text().trim();
      console.warn(`[GETYOURGUIDE][WARN] Body text length: ${bodyText.length}`);
      if (bodyText.length > 0) {
        console.warn(`[GETYOURGUIDE][WARN] First 500 chars of body text: ${bodyText.substring(0, 500)}...`);
      }
    }
    
    // Basic validation
    if (!title || !content || content.length < 50) {
      console.warn(`[GETYOURGUIDE][WARN] Invalid content for ${url}`);
      console.warn(`[GETYOURGUIDE][WARN] Title: "${title}"`);
      console.warn(`[GETYOURGUIDE][WARN] Content length: ${content.length}`);
      return null;
    }

    // Check for soft-404
    if (isSoft404(title, content)) {
      console.warn(`[GETYOURGUIDE][WARN] Detected soft-404 for ${url}`);
      return null;
    }

    console.log(`[GETYOURGUIDE][SUCCESS] Found content:`);
    console.log(`[GETYOURGUIDE][SUCCESS] Title: ${title}`);
    console.log(`[GETYOURGUIDE][SUCCESS] Content preview: ${content.substring(0, 100)}...`);

    return {
      platform: 'GetYourGuide',
      url,
      question: title,
      answer: content,
    };
  } catch (error) {
    console.error(`[GETYOURGUIDE][ERROR] Failed to crawl ${url}:`, error);
    return null;
  }
}

export async function crawlGetYourGuideArticles(urls: string[] = VERIFIED_URLS): Promise<GetYourGuideArticle[]> {
  console.log('[GETYOURGUIDE] Starting crawl of supplier help center articles');
  
  const results: GetYourGuideArticle[] = [];
  const processedUrls = new Set<string>();
  
  for (const url of urls) {
    try {
      // If it's a category page, extract article links first
      if (url.includes('/categories/')) {
        const articleLinks = await extractArticleLinks(url);
        console.log(`[GETYOURGUIDE] Found ${articleLinks.length} articles in category ${url}`);
        
        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Crawl each article
        for (const articleUrl of articleLinks) {
          if (!processedUrls.has(articleUrl)) {
            processedUrls.add(articleUrl);
            const article = await crawlGetYourGuideArticle(articleUrl);
            if (article) {
              results.push(article);
              console.log(`[GETYOURGUIDE] Successfully crawled: ${articleUrl}`);
              console.log(`[GETYOURGUIDE] Title: ${article.question}`);
              console.log(`[GETYOURGUIDE] Content length: ${article.answer.length} characters`);
            }
            
            // Add a small delay between requests
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } else {
        // Direct article URL
        if (!processedUrls.has(url)) {
          processedUrls.add(url);
          const article = await crawlGetYourGuideArticle(url);
          if (article) {
            results.push(article);
            console.log(`[GETYOURGUIDE] Successfully crawled: ${url}`);
            console.log(`[GETYOURGUIDE] Title: ${article.question}`);
            console.log(`[GETYOURGUIDE] Content length: ${article.answer.length} characters`);
          }
        }
      }
    } catch (error) {
      console.error(`[GETYOURGUIDE] Failed to process ${url}:`, error);
    }
  }
  
  console.log(`[GETYOURGUIDE] Completed crawl of ${results.length} articles`);
  return results;
} 