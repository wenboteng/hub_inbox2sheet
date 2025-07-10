import { fetchHtml } from '../utils/fetchHtml';
import { parseContent, cleanText, ParsedContent } from '../utils/parseHelpers';
import * as cheerio from 'cheerio';

// Updated selectors based on actual Viator help center structure
const VIATOR_SELECTORS = {
  title: 'h1, .article-title, .help-center-title, .page-title, .title, [data-testid="article-title"]',
  content: '.article-content, .help-center-content, .article-body, .content, .article-text, [data-testid="article-content"]',
};

// Enhanced configuration with better error handling
const VIATOR_CONFIG = {
  rateLimit: {
    minDelay: 3000,  // Increased from 1500ms
    maxDelay: 6000,  // Increased from 4000ms
  },
  retryAttempts: 3,
  exponentialBackoff: true,
  userAgents: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  ],
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
  },
};

// Comprehensive list of discovered Viator article URLs
const VIATOR_ARTICLE_URLS = [
  // From main help page discovery
  'https://www.viator.com/help/articles/35',
  'https://www.viator.com/help/articles/33',
  'https://www.viator.com/help/articles/24',
  'https://www.viator.com/help/articles/81',
  
  // From systematic testing
  'https://www.viator.com/help/articles/5',
  'https://www.viator.com/help/articles/6',
  'https://www.viator.com/help/articles/7',
  'https://www.viator.com/help/articles/11',
  'https://www.viator.com/help/articles/12',
  'https://www.viator.com/help/articles/14',
  'https://www.viator.com/help/articles/15',
  'https://www.viator.com/help/articles/16',
  'https://www.viator.com/help/articles/17',
  'https://www.viator.com/help/articles/18',
  'https://www.viator.com/help/articles/19',
  'https://www.viator.com/help/articles/23',
  'https://www.viator.com/help/articles/25',
  'https://www.viator.com/help/articles/26',
  'https://www.viator.com/help/articles/27',
  'https://www.viator.com/help/articles/28',
  'https://www.viator.com/help/articles/29',
  'https://www.viator.com/help/articles/30',
  'https://www.viator.com/help/articles/31',
  'https://www.viator.com/help/articles/34',
  'https://www.viator.com/help/articles/36',
  'https://www.viator.com/help/articles/37',
  'https://www.viator.com/help/articles/39',
  'https://www.viator.com/help/articles/40',
  'https://www.viator.com/help/articles/42',
  'https://www.viator.com/help/articles/45',
  'https://www.viator.com/help/articles/46',
  'https://www.viator.com/help/articles/47',
  'https://www.viator.com/help/articles/48',
  'https://www.viator.com/help/articles/49',
  'https://www.viator.com/help/articles/50',
  'https://www.viator.com/help/articles/51',
  'https://www.viator.com/help/articles/52',
  'https://www.viator.com/help/articles/53',
  'https://www.viator.com/help/articles/54',
  'https://www.viator.com/help/articles/55',
  'https://www.viator.com/help/articles/56',
  'https://www.viator.com/help/articles/58',
  'https://www.viator.com/help/articles/59',
  'https://www.viator.com/help/articles/60',
];

export interface ViatorArticle {
  platform: 'Viator';
  url: string;
  question: string;
  answer: string;
  rawHtml?: string;
}

// Helper function to get random delay
function getRandomDelay(): number {
  return Math.floor(
    Math.random() * 
    (VIATOR_CONFIG.rateLimit.maxDelay - VIATOR_CONFIG.rateLimit.minDelay) + 
    VIATOR_CONFIG.rateLimit.minDelay
  );
}

// Helper function to get random user agent
function getRandomUserAgent(): string {
  return VIATOR_CONFIG.userAgents[Math.floor(Math.random() * VIATOR_CONFIG.userAgents.length)];
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced fetch function with retry logic
async function fetchHtmlWithRetry(url: string, attempt = 1): Promise<string> {
  try {
    const userAgent = getRandomUserAgent();
    const headers = {
      ...VIATOR_CONFIG.headers,
      'User-Agent': userAgent,
    };

    console.log(`[VIATOR] Fetching ${url} (attempt ${attempt}) with User-Agent: ${userAgent.substring(0, 50)}...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (response.status === 403) {
      console.log(`[VIATOR] 403 Forbidden for ${url} - likely anti-bot protection`);
      if (attempt < VIATOR_CONFIG.retryAttempts) {
        const backoffDelay = VIATOR_CONFIG.exponentialBackoff ? 
          Math.min(5000 * Math.pow(2, attempt), 30000) : 5000;
        console.log(`[VIATOR] Retrying in ${backoffDelay}ms...`);
        await delay(backoffDelay);
        return fetchHtmlWithRetry(url, attempt + 1);
      }
      throw new Error('403 Forbidden - anti-bot protection');
    }

    if (response.status === 429) {
      console.log(`[VIATOR] 429 Rate limited for ${url}`);
      if (attempt < VIATOR_CONFIG.retryAttempts) {
        const backoffDelay = 30000; // Wait 30 seconds for rate limits
        console.log(`[VIATOR] Retrying in ${backoffDelay}ms...`);
        await delay(backoffDelay);
        return fetchHtmlWithRetry(url, attempt + 1);
      }
      throw new Error('429 Rate limited');
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    if (attempt < VIATOR_CONFIG.retryAttempts) {
      const backoffDelay = VIATOR_CONFIG.exponentialBackoff ? 
        Math.min(2000 * Math.pow(2, attempt), 15000) : 2000;
      console.log(`[VIATOR] Error fetching ${url} (attempt ${attempt}): ${error}. Retrying in ${backoffDelay}ms...`);
      await delay(backoffDelay);
      return fetchHtmlWithRetry(url, attempt + 1);
    }
    throw error;
  }
}

export async function crawlViatorArticle(url: string): Promise<ViatorArticle> {
  console.log(`[VIATOR] Crawling ${url}`);
  
  try {
    const html = await fetchHtmlWithRetry(url);
    const parsed = parseContent(html, VIATOR_SELECTORS);
    
    // Enhanced debugging
    console.log(`[VIATOR] Raw title: "${parsed.title}"`);
    console.log(`[VIATOR] Content length: ${parsed.content.length}`);
    
    if (!parsed.title || parsed.title.trim() === '') {
      console.log(`[VIATOR] Warning: Empty title for ${url}`);
      console.log(`[VIATOR] Trying alternative title extraction...`);
      
      // Try alternative title extraction
      const $ = cheerio.load(html);
      const alternativeTitles = [
        $('title').text().trim(),
        $('meta[property="og:title"]').attr('content') || '',
        $('meta[name="title"]').attr('content') || '',
        $('.breadcrumb').last().text().trim(),
        $('nav').find('a').last().text().trim(),
      ].filter(title => title && title.length > 0);
      
      if (alternativeTitles.length > 0) {
        parsed.title = alternativeTitles[0];
        console.log(`[VIATOR] Found alternative title: "${parsed.title}"`);
      } else {
        // Generate a unique title from the URL and content
        const urlParts = url.split('/');
        const articleId = urlParts[urlParts.length - 1];
        
        // Try to extract meaningful content for title generation
        let contentPreview = '';
        if (parsed.content && parsed.content.length > 0) {
          // Take first 100 characters and clean them
          contentPreview = parsed.content.substring(0, 100)
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        // Generate a unique title
        if (contentPreview && contentPreview.length > 10) {
          // Use first meaningful sentence or phrase
          const firstSentence = contentPreview.split(/[.!?]/)[0].trim();
          if (firstSentence.length > 5) {
            parsed.title = `Viator Help - ${firstSentence}`;
          } else {
            parsed.title = `Viator Help Article ${articleId}`;
          }
        } else {
          parsed.title = `Viator Help Article ${articleId}`;
        }
        
        console.log(`[VIATOR] Generated unique title: "${parsed.title}"`);
      }
    }
    
    if (!parsed.content || parsed.content.trim() === '') {
      console.log(`[VIATOR] Warning: Empty content for ${url}`);
      console.log(`[VIATOR] Trying alternative content extraction...`);
      
      // Try alternative content extraction
      const $ = cheerio.load(html);
      const alternativeContent = [
        $('main').text().trim(),
        $('article').text().trim(),
        $('.main-content').text().trim(),
        $('body').text().trim(),
      ].filter(content => content && content.length > 100);
      
      if (alternativeContent.length > 0) {
        parsed.content = alternativeContent[0];
        console.log(`[VIATOR] Found alternative content (${parsed.content.length} chars)`);
      }
    }
    
    // Final validation and unique title generation
    if (!parsed.title || parsed.title.trim() === '') {
      console.log(`[VIATOR] Error: Still no title found for ${url}`);
      const urlParts = url.split('/');
      const articleId = urlParts[urlParts.length - 1];
      parsed.title = `Viator Help Article ${articleId}`;
    }
    
    if (!parsed.content || parsed.content.trim() === '') {
      console.log(`[VIATOR] Error: Still no content found for ${url}`);
      parsed.content = 'Content not available';
    }
    
    // Ensure title is unique by adding article ID if it's generic
    if (parsed.title === 'Help Center' || parsed.title === 'Viator Help Article') {
      const urlParts = url.split('/');
      const articleId = urlParts[urlParts.length - 1];
      parsed.title = `Viator Help Article ${articleId}`;
      console.log(`[VIATOR] Made title unique: "${parsed.title}"`);
    }
    
    const cleanedContent = cleanText(parsed.content);
    
    console.log(`[VIATOR] Final title: "${parsed.title}"`);
    console.log(`[VIATOR] Final content length: ${cleanedContent.length}`);
    
    return {
      platform: 'Viator',
      url,
      question: parsed.title,
      answer: cleanedContent,
      rawHtml: parsed.rawHtml,
    };
  } catch (error) {
    console.error(`[VIATOR] Error crawling ${url}:`, error);
    // Return a minimal article to avoid breaking the process
    const urlParts = url.split('/');
    const articleId = urlParts[urlParts.length - 1];
    return {
      platform: 'Viator',
      url,
      question: `Viator Help Article ${articleId}`,
      answer: 'Content not available due to crawling error',
    };
  }
}

export async function crawlViatorArticles(): Promise<ViatorArticle[]> {
  const helpCenterUrl = 'https://www.viator.com/help/';
  console.log(`[VIATOR] Starting discovery from ${helpCenterUrl}`);
  const discoveredUrls = new Set<string>();

  try {
    const mainHtml = await fetchHtmlWithRetry(helpCenterUrl);
    const $ = cheerio.load(mainHtml);
    
    console.log(`[VIATOR] Main page HTML length: ${mainHtml.length}`);
    
    // Enhanced selectors for finding article links
    const articleSelectors = [
      'a[href*="/help/articles/"]',
      'a[href*="/help/article/"]',
      '.article-link',
      '.help-article-link',
      'a[href*="help"]',
    ];
    
    let totalLinksFound = 0;
    
    for (const selector of articleSelectors) {
      const links = $(selector);
      console.log(`[VIATOR] Found ${links.length} links with selector: ${selector}`);
      totalLinksFound += links.length;
      
      links.each((i, el) => {
        const href = $(el).attr('href');
        if (href) {
          const fullUrl = href.startsWith('http') ? href : new URL(href, helpCenterUrl).toString();
          if (fullUrl.includes('/help/') && fullUrl.includes('/articles/')) {
            discoveredUrls.add(fullUrl);
          }
        }
      });
    }
    
    console.log(`[VIATOR] Total links found: ${totalLinksFound}`);
    console.log(`[VIATOR] Unique article URLs discovered: ${discoveredUrls.size}`);
    
    // Add all known URLs from our comprehensive list
    VIATOR_ARTICLE_URLS.forEach(url => discoveredUrls.add(url));
    console.log(`[VIATOR] Added ${VIATOR_ARTICLE_URLS.length} known URLs from comprehensive list`);
    
  } catch (error) {
    console.error(`[VIATOR] Failed to crawl main help page ${helpCenterUrl}:`, error);
    
    // Fallback to comprehensive known URLs if main page fails
    console.log(`[VIATOR] Using fallback comprehensive known URLs...`);
    VIATOR_ARTICLE_URLS.forEach(url => discoveredUrls.add(url));
  }

  const uniqueUrls = Array.from(discoveredUrls);
  console.log(`[VIATOR] Final unique article URLs: ${uniqueUrls.length}`);
  
  const results: ViatorArticle[] = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const url of uniqueUrls) {
    try {
      console.log(`[VIATOR] Processing: ${url}`);
      const article = await crawlViatorArticle(url);
      
      // Validate the article before adding
      if (article.question && article.question.trim() !== '' && 
          article.answer && article.answer.length > 50) {
        results.push(article);
        successCount++;
        console.log(`[VIATOR] Success: "${article.question}" (${article.answer.length} chars)`);
      } else {
        console.log(`[VIATOR] Skipping invalid article: "${article.question}" (${article.answer.length} chars)`);
        errorCount++;
      }
      
      // Add a delay between requests to avoid being blocked
      await delay(getRandomDelay());
    } catch (error) {
      console.error(`[VIATOR] Failed to crawl article ${url}:`, error);
      errorCount++;
    }
  }
  
  console.log(`[VIATOR] Crawl completed: ${successCount} successful, ${errorCount} failed`);
  console.log(`[VIATOR] Total valid articles: ${results.length}`);
  
  return results;
} 