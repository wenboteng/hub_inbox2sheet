#!/usr/bin/env tsx

import { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { getContentEmbeddings } from '../src/utils/openai';
import { detectLanguage } from '../src/utils/languageDetection';
import { slugify } from '../src/utils/slugify';
import { createBrowser } from '../src/utils/puppeteer';

const prisma = new PrismaClient();

// Simple text cleaning
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}

interface ParagraphWithEmbedding {
  text: string;
  embedding: number[];
}

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
    minDelay: 2000,
    maxDelay: 5000,
  },
  maxThreadsPerCategory: 50, // Reduced for production safety
  maxRepliesPerThread: 25, // Reduced for production safety
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
}

interface CrawlStats {
  categoriesDiscovered: number;
  threadsDiscovered: number;
  postsExtracted: number;
  repliesExtracted: number;
  errors: string[];
  skippedUrls: string[];
}

class StandaloneAirbnbCommunityCrawler {
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

  async initialize(): Promise<void> {
    console.log('[AIRBNB-COMMUNITY] Initializing standalone crawler...');
    
    this.browser = await createBrowser();
    console.log('[AIRBNB-COMMUNITY] Browser initialized successfully');
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
      
      // Process up to 3 pages to avoid infinite loops
      let pageCount = 0;
      const maxPages = 3;
      
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
      const languageDetection = detectLanguage(cleanedContent);
      
      // Only process English content
      if (languageDetection.language !== 'en') {
        console.log(`[AIRBNB-COMMUNITY] Skipping non-English content (${languageDetection.language}): ${url}`);
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
        const languageDetection = detectLanguage(cleanedContent);
        
        // Only process English content
        if (languageDetection.language !== 'en') {
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

        // Check if slug already exists
        const existingSlug = await prisma.article.findUnique({ where: { slug: uniqueSlug } });
        if (existingSlug) {
          console.log(`[AIRBNB-COMMUNITY] Slug conflict detected: ${uniqueSlug} already exists`);
          this.stats.errors.push(`Slug conflict for ${post.url}`);
          continue;
        }

        // Detect language
        const languageDetection = detectLanguage(post.answer);

        // Generate embeddings for paragraphs
        let paragraphsWithEmbeddings: ParagraphWithEmbedding[] = [];
        try {
          paragraphsWithEmbeddings = await getContentEmbeddings(post.answer);
          console.log(`[AIRBNB-COMMUNITY] Generated embeddings for ${paragraphsWithEmbeddings.length} paragraphs`);
        } catch (embeddingError) {
          console.error('[AIRBNB-COMMUNITY] Failed to generate embeddings:', embeddingError);
          this.stats.errors.push(`Failed to generate embeddings for ${post.url}: ${embeddingError}`);
          // Continue without embeddings
        }

        // Save to database
        const created = await prisma.article.create({
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
            language: languageDetection.language,
            crawlStatus: 'active',
          }
        });

        // Create paragraphs if embeddings were generated
        if (paragraphsWithEmbeddings.length > 0) {
          await prisma.articleParagraph.createMany({
            data: paragraphsWithEmbeddings.map(p => ({
              articleId: created.id,
              text: p.text,
              embedding: p.embedding,
            })),
          });
          console.log(`[AIRBNB-COMMUNITY] Created ${paragraphsWithEmbeddings.length} paragraph embeddings`);
        }

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
    console.log('[AIRBNB-COMMUNITY] Starting standalone Airbnb Community crawl...');
    
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
      
      // Crawl each category (limit to first 5 for production safety)
      const limitedCategories = categoryUrls.slice(0, 5);
      
      for (const categoryUrl of limitedCategories) {
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

// Main execution function
async function runStandaloneCrawl() {
  console.log('🚀 Starting Standalone Airbnb Community Crawl');
  console.log('==============================================');
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  try {
    const startTime = Date.now();
    
    // Run the standalone crawler
    const crawler = new StandaloneAirbnbCommunityCrawler();
    const stats = await crawler.crawl();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n✅ Standalone Crawl Completed!');
    console.log('===============================');
    console.log(`⏱️  Duration: ${duration} seconds (${Math.round(duration / 60)} minutes)`);
    console.log(`📊 Categories discovered: ${stats.categoriesDiscovered}`);
    console.log(`🧵 Threads discovered: ${stats.threadsDiscovered}`);
    console.log(`📝 Posts extracted: ${stats.postsExtracted}`);
    console.log(`💬 Replies extracted: ${stats.repliesExtracted}`);
    console.log(`❌ Errors: ${stats.errors.length}`);
    console.log(`⏭️  Skipped URLs: ${stats.skippedUrls.length}`);
    
    // Summary
    const totalExtracted = stats.postsExtracted + stats.repliesExtracted;
    console.log(`\n🎯 Total content extracted: ${totalExtracted} items`);
    
    // Success/failure determination
    if (totalExtracted > 0) {
      console.log('\n✅ CRAWL SUCCESSFUL - Content was extracted and saved to database');
      process.exit(0);
    } else {
      console.log('\n⚠️  CRAWL WARNING - No content was extracted. Check site structure.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Standalone crawl failed:', error);
    process.exit(1);
  }
}

// Run the standalone crawl
runStandaloneCrawl()
  .catch((error) => {
    console.error('💥 Standalone crawl crashed:', error);
    process.exit(1);
  }); 