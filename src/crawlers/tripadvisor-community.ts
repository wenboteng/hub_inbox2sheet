import puppeteer, { Browser, Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// TripAdvisor Community configuration
const TRIPADVISOR_CONFIG = {
  baseUrl: 'https://www.tripadvisor.com/ShowForum-g1',
  categories: [
    'https://www.tripadvisor.com/ShowForum-g1-i10702-Air_Travel.html',
    'https://www.tripadvisor.com/ShowForum-g1-i10703-Hotels.html',
    'https://www.tripadvisor.com/ShowForum-g1-i10704-Vacation_Packages.html',
    'https://www.tripadvisor.com/ShowForum-g1-i10705-Cruises.html',
    'https://www.tripadvisor.com/ShowForum-g1-i10706-Restaurants.html',
    'https://www.tripadvisor.com/ShowForum-g1-i10707-Attractions.html',
    'https://www.tripadvisor.com/ShowForum-g1-i10708-Shopping.html',
    'https://www.tripadvisor.com/ShowForum-g1-i10709-Transportation.html',
  ],
  rateLimit: {
    minDelay: 1000,
    maxDelay: 3000,
  },
  maxThreadsPerCategory: 30,
  maxRepliesPerThread: 10,
  tourVendorKeywords: [
    'tour', 'guide', 'booking', 'reservation', 'package', 'excursion',
    'activity', 'attraction', 'museum', 'sightseeing', 'guided tour',
    'day trip', 'city tour', 'adventure', 'experience', 'ticket',
    'entrance', 'admission', 'visit', 'explore', 'discover',
    'vacation', 'holiday', 'travel', 'trip', 'destination',
    'hotel', 'accommodation', 'stay', 'lodging', 'resort',
    'cruise', 'sailing', 'boat', 'ferry', 'transportation',
    'airline', 'flight', 'airport', 'travel agent', 'agency'
  ],
  excludeKeywords: [
    'mobile', 'phone', 'signal', 'wifi', 'internet', 'connection',
    'roaming', 'data', 'sim card', 'network', 'coverage',
    'javascript', 'script', 'function', 'document', 'window',
    'undefined', 'null', 'error', 'exception', 'debug'
  ]
};

export interface TripAdvisorPost {
  platform: 'TripAdvisor';
  url: string;
  question: string;
  answer: string;
  author?: string;
  date?: string;
  category?: string;
  contentType: 'community';
  source: 'community';
  replies?: number;
  views?: number;
}

// Helper function to delay between requests
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to get random delay within range
function getRandomDelay(): number {
  return Math.floor(
    Math.random() * 
    (TRIPADVISOR_CONFIG.rateLimit.maxDelay - TRIPADVISOR_CONFIG.rateLimit.minDelay) + 
    TRIPADVISOR_CONFIG.rateLimit.minDelay
  );
}

// Check if content is tour vendor related
function isTourVendorRelated(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check for exclude keywords first
  for (const excludeKeyword of TRIPADVISOR_CONFIG.excludeKeywords) {
    if (lowerText.includes(excludeKeyword.toLowerCase())) {
      return false;
    }
  }
  
  // Check for tour vendor keywords
  for (const keyword of TRIPADVISOR_CONFIG.tourVendorKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

// Clean content by removing JavaScript and other artifacts
function cleanContent(text: string): string {
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/function\s*\([^)]*\)\s*\{[^}]*\}/g, '') // Remove function definitions
    .replace(/document\.[^;]*;?/g, '') // Remove document references
    .replace(/window\.[^;]*;?/g, '') // Remove window references
    .replace(/undefined/g, '') // Remove undefined
    .replace(/null/g, '') // Remove null
    .replace(/error/g, '') // Remove error
    .replace(/exception/g, '') // Remove exception
    .replace(/debug/g, '') // Remove debug
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

// Check if content has minimum quality
function hasMinimumQuality(text: string): boolean {
  const cleanedText = cleanContent(text);
  return cleanedText.length >= 20 && cleanedText.length <= 5000; // Reasonable length
}

// Setup page with anti-detection measures
async function setupPage(page: Page): Promise<void> {
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set extra headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  });
  
  // Block unnecessary resources
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });
}

// Extract thread URLs from category page
async function extractThreadUrls(page: Page, categoryUrl: string): Promise<string[]> {
  console.log(`[TRIPADVISOR] Extracting threads from: ${categoryUrl}`);
  
  try {
    await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(getRandomDelay());
    
    // Extract thread URLs
    const threadUrls = await page.evaluate(() => {
      const threads = Array.from(document.querySelectorAll('a[href*="/ShowTopic-"]'));
      return threads
        .map(thread => (thread as HTMLAnchorElement).href)
        .filter(url => url.includes('/ShowTopic-'))
        .slice(0, 50); // Limit to 50 threads per category
    });
    
    console.log(`[TRIPADVISOR] Found ${threadUrls.length} threads in category`);
    return threadUrls;
  } catch (error) {
    console.error(`[TRIPADVISOR][ERROR] Failed to extract threads from ${categoryUrl}:`, error);
    return [];
  }
}

// Extract thread content and replies
async function extractThreadContent(page: Page, threadUrl: string): Promise<TripAdvisorPost[]> {
  console.log(`[TRIPADVISOR] Extracting content from: ${threadUrl}`);
  
  try {
    await page.goto(threadUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(getRandomDelay());
    
    const threadData = await page.evaluate(() => {
      // Try multiple selectors for topic title
      const topicSelectors = [
        '.topicTitle',
        'h1.topicTitle',
        '.topic_title',
        'h1',
        '.postTitle',
        '.threadTitle'
      ];
      
      let topicTitle = '';
      for (const selector of topicSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          topicTitle = element.textContent.trim();
          if (topicTitle.length > 0) break;
        }
      }
      
      // Extract topic content - try multiple selectors
      const contentSelectors = [
        '.postBody',
        '.post_body',
        '.messageBody',
        '.content',
        '.postContent'
      ];
      
      let topicContent = '';
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          topicContent = element.textContent.trim();
          if (topicContent.length > 0) break;
        }
      }
      
      // Extract author
      const authorSelectors = [
        '.username',
        '.user_name',
        '.author',
        '.poster'
      ];
      
      let author = 'Unknown';
      for (const selector of authorSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          author = element.textContent.trim();
          if (author.length > 0) break;
        }
      }
      
      // Extract date
      const dateSelectors = [
        '.postDate',
        '.post_date',
        '.date',
        '.timestamp'
      ];
      
      let date = '';
      for (const selector of dateSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          date = element.textContent.trim();
          if (date.length > 0) break;
        }
      }
      
      // Extract replies - try multiple selectors
      const replySelectors = [
        '.postBody',
        '.post_body',
        '.messageBody',
        '.content',
        '.reply'
      ];
      
      const replies: Array<{content: string, author: string, date: string}> = [];
      
      for (const selector of replySelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 1) { // Skip first element (topic)
          for (let i = 1; i < Math.min(elements.length, 11); i++) { // Limit to 10 replies
            const element = elements[i];
            if (element && element.textContent) {
              const content = element.textContent.trim();
              if (content.length > 0) {
                const replyAuthor = element.closest('.post')?.querySelector('.username')?.textContent?.trim() || 'Unknown';
                const replyDate = element.closest('.post')?.querySelector('.postDate')?.textContent?.trim() || '';
                replies.push({ content, author: replyAuthor, date: replyDate });
              }
            }
          }
          break;
        }
      }
      
      return {
        topicTitle,
        topicContent,
        author,
        date,
        replies
      };
    });
    
    const posts: TripAdvisorPost[] = [];
    
    // Create main topic post only if it's tour vendor related and has quality
    if (threadData.topicTitle && threadData.topicContent) {
      const cleanedContent = cleanContent(threadData.topicContent);
      if (isTourVendorRelated(cleanedContent) && hasMinimumQuality(cleanedContent)) {
        posts.push({
          platform: 'TripAdvisor',
          url: threadUrl,
          question: threadData.topicTitle,
          answer: cleanedContent,
          author: threadData.author,
          date: threadData.date,
          category: 'Travel Forum',
          contentType: 'community',
          source: 'community',
          replies: threadData.replies.length,
        });
      }
    }
    
    // Create reply posts only if they're tour vendor related and have quality
    threadData.replies.forEach((reply, index) => {
      if (reply.content) {
        const cleanedContent = cleanContent(reply.content);
        if (isTourVendorRelated(cleanedContent) && hasMinimumQuality(cleanedContent)) {
          posts.push({
            platform: 'TripAdvisor',
            url: `${threadUrl}#reply-${index + 1}`,
            question: threadData.topicTitle || 'Travel Question',
            answer: cleanedContent,
            author: reply.author,
            date: reply.date,
            category: 'Travel Forum',
            contentType: 'community',
            source: 'community',
          });
        }
      }
    });
    
    console.log(`[TRIPADVISOR] Extracted ${posts.length} quality posts from thread`);
    return posts;
  } catch (error) {
    console.error(`[TRIPADVISOR][ERROR] Failed to extract content from ${threadUrl}:`, error);
    return [];
  }
}

// Save posts to database
async function saveToDatabase(posts: TripAdvisorPost[]): Promise<void> {
  console.log(`[TRIPADVISOR] Saving ${posts.length} posts to database`);
  
  for (const post of posts) {
    try {
      // Check if post already exists
      const existing = await prisma.article.findFirst({
        where: { url: post.url }
      });
      
      if (!existing) {
        await prisma.article.create({
          data: {
            url: post.url,
            question: post.question,
            answer: post.answer,
            slug: post.question.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50),
            author: post.author || 'Unknown',
            category: post.category || 'TripAdvisor',
            contentType: post.contentType,
            source: post.source,
            platform: post.platform,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
      }
    } catch (error) {
      console.error(`[TRIPADVISOR][ERROR] Failed to save post:`, error);
    }
  }
}

// Main crawling function
export async function crawlTripAdvisorCommunity(): Promise<TripAdvisorPost[]> {
  console.log('[TRIPADVISOR] Starting TripAdvisor Community crawler...');
  
  let browser: Browser | null = null;
  const allPosts: TripAdvisorPost[] = [];
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    });
    
    const page = await browser.newPage();
    await setupPage(page);
    
    for (const categoryUrl of TRIPADVISOR_CONFIG.categories) {
      try {
        console.log(`[TRIPADVISOR] Processing category: ${categoryUrl}`);
        
        // Extract thread URLs from category
        const threadUrls = await extractThreadUrls(page, categoryUrl);
        
        // Process each thread
        for (const threadUrl of threadUrls) {
          try {
            const threadPosts = await extractThreadContent(page, threadUrl);
            allPosts.push(...threadPosts);
            
            // Save to database
            await saveToDatabase(threadPosts);
            
            // Random delay between threads
            await delay(getRandomDelay());
            
          } catch (error) {
            console.error(`[TRIPADVISOR][ERROR] Failed to process thread ${threadUrl}:`, error);
          }
        }
        
        // Delay between categories
        await delay(getRandomDelay());
        
      } catch (error) {
        console.error(`[TRIPADVISOR][ERROR] Failed to process category ${categoryUrl}:`, error);
      }
    }
    
  } catch (error) {
    console.error('[TRIPADVISOR][ERROR] Failed to create browser:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('[TRIPADVISOR] Browser closed');
    }
  }
  
  console.log(`[TRIPADVISOR] Crawling completed. Total posts: ${allPosts.length}`);
  return allPosts;
}

// Test function
export async function testTripAdvisorCrawler(): Promise<void> {
  console.log('[TRIPADVISOR] Testing crawler with limited data...');
  
  const testCategories = TRIPADVISOR_CONFIG.categories.slice(0, 2); // Only test with 2 categories
  const testPosts: TripAdvisorPost[] = [];
  
  let browser: Browser | null = null;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
    
    const page = await browser.newPage();
    await setupPage(page);
    
    for (const categoryUrl of testCategories) {
      const threadUrls = await extractThreadUrls(page, categoryUrl);
      const limitedThreadUrls = threadUrls.slice(0, 2); // Only test with 2 threads per category
      
      for (const threadUrl of limitedThreadUrls) {
        const threadPosts = await extractThreadContent(page, threadUrl);
        testPosts.push(...threadPosts);
        
        await delay(getRandomDelay());
      }
      
      await delay(getRandomDelay());
    }
    
  } catch (error) {
    console.error('[TRIPADVISOR][ERROR] Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  console.log(`[TRIPADVISOR] Test completed. Found ${testPosts.length} posts`);
  console.log('[TRIPADVISOR] Sample posts:');
  testPosts.slice(0, 3).forEach((post, index) => {
    console.log(`${index + 1}. ${post.question.substring(0, 100)}...`);
  });
} 