import axios from 'axios';
import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetchHtml';
import { cleanText } from '../utils/parseHelpers';

export interface ExpediaArticle {
  platform: 'Expedia';
  url: string;
  question: string;
  answer: string;
  category?: string;
}

// Expedia help center URLs
const EXPEDIA_URLS = [
  'https://help.expedia.com',
  'https://help.expedia.com/hc/en-us',
  'https://help.expedia.com/hc/en-us/categories',
  'https://help.expedia.com/hc/en-us/sections',
];

// Known Expedia help articles
const KNOWN_ARTICLES = [
  'https://help.expedia.com/hc/en-us/articles/360000191263',
  'https://help.expedia.com/hc/en-us/articles/360000191264',
  'https://help.expedia.com/hc/en-us/articles/360000191265',
  'https://help.expedia.com/hc/en-us/articles/360000191266',
  'https://help.expedia.com/hc/en-us/articles/360000191267',
  'https://help.expedia.com/hc/en-us/articles/360000191268',
  'https://help.expedia.com/hc/en-us/articles/360000191269',
  'https://help.expedia.com/hc/en-us/articles/360000191270',
  'https://help.expedia.com/hc/en-us/articles/360000191271',
  'https://help.expedia.com/hc/en-us/articles/360000191272',
];

// Browser headers to avoid being blocked
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

async function crawlExpediaArticle(url: string): Promise<ExpediaArticle | null> {
  console.log(`[EXPEDIA] Crawling ${url}`);
  
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    
    // Try multiple selectors for title and content
    const title = $('h1, .article-title, .title, .page-title, [data-testid="article-title"]').first().text().trim();
    const content = $('.article-content, .article-body, .content, .help-content, main, [data-testid="article-content"]').first().text().trim();
    
    // If no content found, try alternative selectors
    let finalTitle = title;
    let finalContent = content;
    
    if (!finalTitle) {
      const alternativeTitles = [
        $('title').text().trim(),
        $('meta[property="og:title"]').attr('content') || '',
        $('meta[name="title"]').attr('content') || '',
        $('.breadcrumb').last().text().trim(),
      ].filter(t => t && t.length > 0);
      
      if (alternativeTitles.length > 0) {
        finalTitle = alternativeTitles[0];
      } else {
        // Generate title from URL
        const urlParts = url.split('/');
        const articleId = urlParts[urlParts.length - 1] || 'unknown';
        finalTitle = `Expedia Help Article ${articleId}`;
      }
    }
    
    if (!finalContent || finalContent.length < 50) {
      const alternativeContent = [
        $('main').text().trim(),
        $('article').text().trim(),
        $('.main-content').text().trim(),
        $('body').text().trim(),
      ].filter(c => c && c.length > 100);
      
      if (alternativeContent.length > 0) {
        finalContent = alternativeContent[0];
      } else {
        finalContent = 'Content not available';
      }
    }
    
    const cleanedContent = cleanText(finalContent);
    
    console.log(`[EXPEDIA] Success: "${finalTitle}" (${cleanedContent.length} chars)`);
    
    return {
      platform: 'Expedia',
      url,
      question: finalTitle,
      answer: cleanedContent,
      category: 'Help Center',
    };
  } catch (error) {
    console.error(`[EXPEDIA] Error crawling ${url}:`, error);
    return null;
  }
}

async function discoverExpediaUrls(): Promise<string[]> {
  console.log('[EXPEDIA] Discovering URLs...');
  const discoveredUrls = new Set<string>();
  
  try {
    // Try to discover URLs from main help page
    const mainHtml = await fetchHtml('https://help.expedia.com/hc/en-us');
    const $ = cheerio.load(mainHtml);
    
    // Find article links
    $('a[href*="/articles/"], a[href*="help"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        const fullUrl = href.startsWith('http') ? href : new URL(href, 'https://help.expedia.com').toString();
        if (fullUrl.includes('expedia.com') && fullUrl.includes('articles')) {
          discoveredUrls.add(fullUrl);
        }
      }
    });
    
    console.log(`[EXPEDIA] Discovered ${discoveredUrls.size} URLs from main page`);
  } catch (error) {
    console.error('[EXPEDIA] Error discovering URLs:', error);
  }
  
  // Add known articles as fallback
  KNOWN_ARTICLES.forEach(url => discoveredUrls.add(url));
  
  return Array.from(discoveredUrls);
}

export async function crawlExpediaArticles(): Promise<ExpediaArticle[]> {
  console.log('[EXPEDIA] Starting Expedia scraping...');
  
  const urls = await discoverExpediaUrls();
  console.log(`[EXPEDIA] Processing ${urls.length} URLs`);
  
  const articles: ExpediaArticle[] = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const url of urls) {
    try {
      const article = await crawlExpediaArticle(url);
      if (article) {
        articles.push(article);
        successCount++;
      } else {
        errorCount++;
      }
    } catch (error) {
      console.error(`[EXPEDIA] Error processing ${url}:`, error);
      errorCount++;
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`[EXPEDIA] Crawl completed: ${successCount} successful, ${errorCount} failed`);
  console.log(`[EXPEDIA] Total valid articles: ${articles.length}`);
  
  return articles;
} 