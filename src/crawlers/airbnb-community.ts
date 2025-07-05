import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { cleanText } from '../utils/parseHelpers';
import { detectLanguage } from '../utils/languageDetection';
import { slugify } from '../utils/slugify';

const prisma = new PrismaClient();

// Airbnb Community specific configuration
const AIRBNB_COMMUNITY_CONFIG = {
  baseUrl: 'https://community.withairbnb.com',
  startUrl: 'https://community.withairbnb.com/t5/Community-Center/ct-p/community-center',
  selectors: {
    // Category/forum links
    categoryLinks: 'a[href*="/t5/"], a[href*="/bd-p/"]',
    // Thread links in category pages
    threadLinks: 'a[href*="/td-p/"], a[href*="/m-p/"]',
    // Thread title
    threadTitle: '.lia-message-subject, .page-title, .topic-title, h1',
    // Thread content
    threadContent: '.lia-message-body-content, .lia-message-body',
    // Thread author
    threadAuthor: '.lia-user-name, .author-name, .user-name',
    // Thread date
    threadDate: 'time[datetime], .lia-message-date, .post-date',
    // Reply posts
    replyPosts: '.lia-message-body, .lia-message, article.lia-message-body',
    // Reply content
    replyContent: '.lia-message-body-content, .message-content',
    // Reply author
    replyAuthor: '.lia-user-name, .author-name, .user-name',
    // Reply date
    replyDate: 'time[datetime], .lia-message-date, .post-date',
    // Pagination links
    paginationLinks: 'a[href*="page="], .lia-paging-full, .pagination a',
    // Next page links
    nextPageLinks: 'a[rel="next"], .lia-paging-next a, .next a',
  },
  rateLimit: {
    minDelay: 500,  // More aggressive - reduced from 2000ms
    maxDelay: 1500, // More aggressive - reduced from 5000ms
  },
  maxThreadsPerCategory: 200, // Increased from 100 for more content
  maxRepliesPerThread: 100, // Increased from 50 for more content
};

interface AirbnbCommunityPost {
  platform: 'Airbnb';
  url: string;
  question: string;
  answer: string;
  author?: string;
  date?: string;
  category?: string;
  contentType: 'community';
  source: 'community';
  isThread: boolean;
  threadId?: string;
  replyTo?: string;
  rawHtml?: string;
}

interface CrawlStats {
  categoriesDiscovered: number;
  threadsDiscovered: number;
  postsExtracted: number;
  repliesExtracted: number;
  errors: string[];
  skippedUrls: string[];
}

class AirbnbCommunityCrawler {
  private browser: Browser | null = null;
  private stats: CrawlStats = {
    categoriesDiscovered: 0,
    threadsDiscovered: 0,
    postsExtracted: 0,
    repliesExtracted: 0,
    errors: [],
    skippedUrls: [],
  };
  private processedUrls = new Set<string>();
  private discoveredUrls = new Set<string>();

  // Public methods for testing
  public getStats(): CrawlStats {
    return { ...this.stats };
  }

  public async testDiscoverCategories(page: Page): Promise<string[]> {
    return await this.discoverCategories(page);
  }

  public async testCrawlCategory(categoryUrl: string): Promise<void> {
    return await this.crawlCategory(categoryUrl);
  }

  async initialize(): Promise<void> {
    console.log('[AIRBNB-COMMUNITY] Initializing crawler...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,800',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    });

    // Set up request interception for performance
    const page = await this.browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'font', 'media', 'stylesheet'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });
    await page.close();
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async delay(): Promise<void> {
    const delayMs = Math.floor(
      Math.random() * 
      (AIRBNB_COMMUNITY_CONFIG.rateLimit.maxDelay - AIRBNB_COMMUNITY_CONFIG.rateLimit.minDelay) + 
      AIRBNB_COMMUNITY_CONFIG.rateLimit.minDelay
    );
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  private async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set language to English
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });

    return page;
  }

  private async extractLinks(page: Page, selector: string): Promise<string[]> {
    return await page.evaluate((sel) => {
      const links = Array.from(document.querySelectorAll(sel));
      return links
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => href && href.startsWith('https://community.withairbnb.com'))
        .map(href => {
          // Remove fragments and query parameters that might cause duplicates
          const url = new URL(href);
          return `${url.origin}${url.pathname}`;
        });
    }, selector);
  }

  private async discoverCategories(page: Page): Promise<string[]> {
    console.log('[AIRBNB-COMMUNITY] Discovering categories...');
    
    const categoryUrls = await this.extractLinks(page, AIRBNB_COMMUNITY_CONFIG.selectors.categoryLinks);
    const uniqueUrls = Array.from(new Set(categoryUrls));
    
    console.log(`[AIRBNB-COMMUNITY] Found ${uniqueUrls.length} category URLs`);
    return uniqueUrls;
  }

  private async discoverThreads(page: Page, categoryUrl: string): Promise<string[]> {
    console.log(`[AIRBNB-COMMUNITY] Discovering threads in category: ${categoryUrl}`);
    
    const threadUrls = await this.extractLinks(page, AIRBNB_COMMUNITY_CONFIG.selectors.threadLinks);
    const uniqueUrls = Array.from(new Set(threadUrls));
    
    console.log(`[AIRBNB-COMMUNITY] Found ${uniqueUrls.length} thread URLs in category`);
    return uniqueUrls.slice(0, AIRBNB_COMMUNITY_CONFIG.maxThreadsPerCategory);
  }

  private async handlePagination(page: Page, baseUrl: string): Promise<string[]> {
    const allUrls = new Set<string>();
    
    try {
      // Get initial page URLs
      const initialUrls = await this.extractLinks(page, AIRBNB_COMMUNITY_CONFIG.selectors.threadLinks);
      initialUrls.forEach(url => allUrls.add(url));

      // Look for pagination links
      const paginationUrls = await this.extractLinks(page, AIRBNB_COMMUNITY_CONFIG.selectors.paginationLinks);
      const nextPageUrls = await this.extractLinks(page, AIRBNB_COMMUNITY_CONFIG.selectors.nextPageLinks);
      
      const allPaginationUrls = [...paginationUrls, ...nextPageUrls];
      
      // Process up to 5 pages to avoid infinite loops
      let pageCount = 0;
      const maxPages = 5;
      
      for (const paginationUrl of allPaginationUrls) {
        if (pageCount >= maxPages) break;
        
        try {
          await this.delay();
          await page.goto(paginationUrl, { waitUntil: 'networkidle0', timeout: 30000 });
          
          const pageUrls = await this.extractLinks(page, AIRBNB_COMMUNITY_CONFIG.selectors.threadLinks);
          pageUrls.forEach(url => allUrls.add(url));
          
          pageCount++;
          console.log(`[AIRBNB-COMMUNITY] Processed pagination page ${pageCount}: ${paginationUrl}`);
        } catch (error) {
          console.error(`[AIRBNB-COMMUNITY] Error processing pagination page: ${paginationUrl}`, error);
          break;
        }
      }
    } catch (error) {
      console.error(`[AIRBNB-COMMUNITY] Error handling pagination for ${baseUrl}:`, error);
    }

    return Array.from(allUrls);
  }

  private async extractThreadData(page: Page, url: string): Promise<AirbnbCommunityPost | null> {
    try {
      console.log(`[AIRBNB-COMMUNITY] Extracting thread data from: ${url}`);
      
      // Extract thread title
      const title = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent?.trim() || '' : '';
      }, AIRBNB_COMMUNITY_CONFIG.selectors.threadTitle);

      // Extract thread content
      const content = await page.evaluate((selector) => {
        const elements = Array.from(document.querySelectorAll(selector));
        return elements.map(el => el.textContent?.trim() || '').join('\n');
      }, AIRBNB_COMMUNITY_CONFIG.selectors.threadContent);

      // Extract thread author
      const author = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent?.trim() || '' : '';
      }, AIRBNB_COMMUNITY_CONFIG.selectors.threadAuthor);

      // Extract thread date
      const date = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.getAttribute('datetime') || element.textContent?.trim() || '' : '';
      }, AIRBNB_COMMUNITY_CONFIG.selectors.threadDate);

      // Extract category from URL
      const category = this.extractCategoryFromUrl(url);

      if (!title || !content) {
        console.log(`[AIRBNB-COMMUNITY] Warning: Missing content for thread ${url}`);
        return null;
      }

      const cleanedContent = cleanText(content);
      
      // More robust language detection
      let language = 'unknown';
      try {
        const detected = await detectLanguage(cleanedContent);
        language = typeof detected === 'string' ? detected : detected.language || 'unknown';
      } catch (error) {
        console.log(`[AIRBNB-COMMUNITY] Language detection failed, defaulting to English: ${error}`);
        language = 'en';
      }
      
      // Only process English content (or if language detection failed, assume English)
      if (language !== 'en' && language !== 'unknown') {
        console.log(`[AIRBNB-COMMUNITY] Skipping non-English content (${language}): ${url}`);
        return null;
      }

      return {
        platform: 'Airbnb',
        url,
        question: title,
        answer: cleanedContent,
        author: author || 'Anonymous',
        date: date || new Date().toISOString(),
        category: category || 'Airbnb Community',
        contentType: 'community',
        source: 'community',
        isThread: true,
        threadId: this.extractThreadId(url),
      };
    } catch (error) {
      console.error(`[AIRBNB-COMMUNITY] Error extracting thread data from ${url}:`, error);
      return null;
    }
  }

  private async extractRepliesData(page: Page, threadUrl: string): Promise<AirbnbCommunityPost[]> {
    const replies: AirbnbCommunityPost[] = [];
    
    try {
      console.log(`[AIRBNB-COMMUNITY] Extracting replies from: ${threadUrl}`);
      
      // Extract all reply posts
      const replyData = await page.evaluate((selectors) => {
        const posts = Array.from(document.querySelectorAll(selectors.replyPosts));
        return posts.slice(1).map((post, index) => { // Skip first post (it's the thread)
          const content = post.querySelector(selectors.replyContent)?.textContent?.trim() || '';
          const author = post.querySelector(selectors.replyAuthor)?.textContent?.trim() || 'Anonymous';
          const date = post.querySelector(selectors.replyDate)?.getAttribute('datetime') || 
                      post.querySelector(selectors.replyDate)?.textContent?.trim() || '';
          
          return { content, author, date, index };
        });
      }, AIRBNB_COMMUNITY_CONFIG.selectors);

      const category = this.extractCategoryFromUrl(threadUrl);
      const threadId = this.extractThreadId(threadUrl);

      for (const reply of replyData.slice(0, AIRBNB_COMMUNITY_CONFIG.maxRepliesPerThread)) {
        if (!reply.content) continue;

        const cleanedContent = cleanText(reply.content);
        
        // More robust language detection
        let language = 'unknown';
        try {
          const detected = await detectLanguage(cleanedContent);
          language = typeof detected === 'string' ? detected : detected.language || 'unknown';
        } catch (error) {
          console.log(`[AIRBNB-COMMUNITY] Language detection failed for reply, defaulting to English: ${error}`);
          language = 'en';
        }
        
        // Only process English content (or if language detection failed, assume English)
        if (language !== 'en' && language !== 'unknown') {
          continue;
        }

        replies.push({
          platform: 'Airbnb',
          url: `${threadUrl}#reply-${reply.index}`,
          question: `Reply to thread: ${this.extractThreadTitle(threadUrl)}`,
          answer: cleanedContent,
          author: reply.author,
          date: reply.date || new Date().toISOString(),
          category: category || 'Airbnb Community',
          contentType: 'community',
          source: 'community',
          isThread: false,
          threadId,
          replyTo: threadUrl,
        });
      }

      console.log(`[AIRBNB-COMMUNITY] Extracted ${replies.length} replies from thread`);
    } catch (error) {
      console.error(`[AIRBNB-COMMUNITY] Error extracting replies from ${threadUrl}:`, error);
    }

    return replies;
  }

  private extractCategoryFromUrl(url: string): string {
    const match = url.match(/\/t5\/([^\/]+)/);
    if (match) {
      return match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return 'Airbnb Community';
  }

  private extractThreadId(url: string): string {
    const match = url.match(/(?:td-p|m-p)\/(\d+)/);
    return match ? match[1] : '';
  }

  private extractThreadTitle(url: string): string {
    const match = url.match(/\/([^\/]+)(?:\/td-p|\/m-p)/);
    return match ? match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Thread';
  }

  private async saveToDatabase(posts: AirbnbCommunityPost[]): Promise<void> {
    console.log(`[AIRBNB-COMMUNITY] Saving ${posts.length} posts to database...`);
    
    for (const post of posts) {
      try {
        // Check if post already exists
        const existing = await prisma.article.findUnique({
          where: { url: post.url }
        });

        if (existing) {
          console.log(`[AIRBNB-COMMUNITY] Post already exists: ${post.url}`);
          continue;
        }

        // Create unique slug from question + URL hash
        const baseSlug = slugify(post.question);
        const urlHash = this.extractThreadId(post.url) || Math.random().toString(36).substring(2, 8);
        const uniqueSlug = `${baseSlug}-${urlHash}`;

        // Save to database
        await prisma.article.create({
          data: {
            url: post.url,
            question: post.question,
            answer: post.answer,
            slug: uniqueSlug,
            category: post.category || 'Airbnb Community',
            platform: post.platform,
            contentType: post.contentType,
            source: post.source,
            author: post.author,
            language: 'en',
            crawlStatus: 'active',
          }
        });

        if (post.isThread) {
          this.stats.postsExtracted++;
        } else {
          this.stats.repliesExtracted++;
        }

        console.log(`[AIRBNB-COMMUNITY] Saved ${post.isThread ? 'thread' : 'reply'}: ${post.url}`);
      } catch (error) {
        console.error(`[AIRBNB-COMMUNITY] Error saving post ${post.url}:`, error);
        this.stats.errors.push(`Failed to save ${post.url}: ${error}`);
      }
    }
  }

  async crawlCategory(categoryUrl: string): Promise<void> {
    const page = await this.createPage();
    
    try {
      console.log(`[AIRBNB-COMMUNITY] Crawling category: ${categoryUrl}`);
      
      await this.delay();
      await page.goto(categoryUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Discover threads with pagination
      const threadUrls = await this.handlePagination(page, categoryUrl);
      this.stats.threadsDiscovered += threadUrls.length;
      
      console.log(`[AIRBNB-COMMUNITY] Found ${threadUrls.length} threads in category`);
      
      // Process each thread
      for (const threadUrl of threadUrls) {
        if (this.processedUrls.has(threadUrl)) {
          continue;
        }
        
        try {
          await this.delay();
          await page.goto(threadUrl, { waitUntil: 'networkidle0', timeout: 30000 });
          
          // Extract thread data
          const threadData = await this.extractThreadData(page, threadUrl);
          if (threadData) {
            await this.saveToDatabase([threadData]);
          }
          
          // Extract replies
          const repliesData = await this.extractRepliesData(page, threadUrl);
          if (repliesData.length > 0) {
            await this.saveToDatabase(repliesData);
          }
          
          this.processedUrls.add(threadUrl);
          
        } catch (error) {
          console.error(`[AIRBNB-COMMUNITY] Error processing thread ${threadUrl}:`, error);
          this.stats.errors.push(`Failed to process thread ${threadUrl}: ${error}`);
        }
      }
      
    } catch (error) {
      console.error(`[AIRBNB-COMMUNITY] Error crawling category ${categoryUrl}:`, error);
      this.stats.errors.push(`Failed to crawl category ${categoryUrl}: ${error}`);
    } finally {
      await page.close();
    }
  }

  async crawl(): Promise<CrawlStats> {
    console.log('[AIRBNB-COMMUNITY] Starting comprehensive Airbnb Community crawl...');
    
    try {
      await this.initialize();
      
      const page = await this.createPage();
      
      // Start from the main community page
      console.log(`[AIRBNB-COMMUNITY] Starting from: ${AIRBNB_COMMUNITY_CONFIG.startUrl}`);
      
      await this.delay();
      await page.goto(AIRBNB_COMMUNITY_CONFIG.startUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Discover categories
      const categoryUrls = await this.discoverCategories(page);
      this.stats.categoriesDiscovered = categoryUrls.length;
      
      await page.close();
      
      // Crawl each category
      for (const categoryUrl of categoryUrls) {
        if (this.processedUrls.has(categoryUrl)) {
          continue;
        }
        
        await this.crawlCategory(categoryUrl);
        this.processedUrls.add(categoryUrl);
      }
      
      console.log('[AIRBNB-COMMUNITY] Crawl completed successfully!');
      
    } catch (error) {
      console.error('[AIRBNB-COMMUNITY] Error during crawl:', error);
      this.stats.errors.push(`Crawl failed: ${error}`);
    } finally {
      await this.cleanup();
    }
    
    // Log final stats
    console.log('\n[AIRBNB-COMMUNITY] ===== CRAWL STATISTICS =====');
    console.log(`Categories discovered: ${this.stats.categoriesDiscovered}`);
    console.log(`Threads discovered: ${this.stats.threadsDiscovered}`);
    console.log(`Posts extracted: ${this.stats.postsExtracted}`);
    console.log(`Replies extracted: ${this.stats.repliesExtracted}`);
    console.log(`Errors: ${this.stats.errors.length}`);
    console.log(`Skipped URLs: ${this.stats.skippedUrls.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n[AIRBNB-COMMUNITY] Errors encountered:');
      this.stats.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    return this.stats;
  }
}

// Export the main crawl function
export async function crawlAirbnbCommunity(): Promise<CrawlStats> {
  const crawler = new AirbnbCommunityCrawler();
  return await crawler.crawl();
}

// Export for testing individual components
export { AirbnbCommunityCrawler }; 