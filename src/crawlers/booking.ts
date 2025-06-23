import axios from 'axios';
import * as cheerio from 'cheerio';
import { fetchHtml } from '../utils/fetchHtml';
import { cleanText } from '../utils/parseHelpers';

export interface BookingArticle {
  platform: 'Booking.com';
  url: string;
  question: string;
  answer: string;
  category?: string;
}

// Booking.com help center URLs
const BOOKING_URLS = [
  'https://www.booking.com/content/help.html',
  'https://www.booking.com/content/help/booking.html',
  'https://www.booking.com/content/help/payment.html',
  'https://www.booking.com/content/help/cancellation.html',
  'https://www.booking.com/content/help/refund.html',
];

// Known Booking.com help articles
const KNOWN_ARTICLES = [
  'https://www.booking.com/content/help/booking.html',
  'https://www.booking.com/content/help/payment.html',
  'https://www.booking.com/content/help/cancellation.html',
  'https://www.booking.com/content/help/refund.html',
  'https://www.booking.com/content/help/contact.html',
  'https://www.booking.com/content/help/account.html',
  'https://www.booking.com/content/help/security.html',
  'https://www.booking.com/content/help/terms.html',
  'https://www.booking.com/content/help/privacy.html',
  'https://www.booking.com/content/help/cookies.html',
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

async function crawlBookingArticle(url: string): Promise<BookingArticle | null> {
  console.log(`[BOOKING] Crawling ${url}`);
  
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
        finalTitle = `Booking.com Help Article ${articleId}`;
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
    
    console.log(`[BOOKING] Success: "${finalTitle}" (${cleanedContent.length} chars)`);
    
    return {
      platform: 'Booking.com',
      url,
      question: finalTitle,
      answer: cleanedContent,
      category: 'Help Center',
    };
  } catch (error) {
    console.error(`[BOOKING] Error crawling ${url}:`, error);
    return null;
  }
}

async function discoverBookingUrls(): Promise<string[]> {
  console.log('[BOOKING] Discovering URLs...');
  const discoveredUrls = new Set<string>();
  
  try {
    // Try to discover URLs from main help page
    const mainHtml = await fetchHtml('https://www.booking.com/content/help.html');
    const $ = cheerio.load(mainHtml);
    
    // Find article links
    $('a[href*="/help/"], a[href*="help"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        const fullUrl = href.startsWith('http') ? href : new URL(href, 'https://www.booking.com').toString();
        if (fullUrl.includes('booking.com') && fullUrl.includes('help')) {
          discoveredUrls.add(fullUrl);
        }
      }
    });
    
    console.log(`[BOOKING] Discovered ${discoveredUrls.size} URLs from main page`);
  } catch (error) {
    console.error('[BOOKING] Error discovering URLs:', error);
  }
  
  // Add known articles as fallback
  KNOWN_ARTICLES.forEach(url => discoveredUrls.add(url));
  
  return Array.from(discoveredUrls);
}

export async function crawlBookingArticles(): Promise<BookingArticle[]> {
  console.log('[BOOKING] Starting Booking.com scraping...');
  
  const urls = await discoverBookingUrls();
  console.log(`[BOOKING] Processing ${urls.length} URLs`);
  
  const articles: BookingArticle[] = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const url of urls) {
    try {
      const article = await crawlBookingArticle(url);
      if (article) {
        articles.push(article);
        successCount++;
      } else {
        errorCount++;
      }
    } catch (error) {
      console.error(`[BOOKING] Error processing ${url}:`, error);
      errorCount++;
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`[BOOKING] Crawl completed: ${successCount} successful, ${errorCount} failed`);
  console.log(`[BOOKING] Total valid articles: ${articles.length}`);
  
  return articles;
} 