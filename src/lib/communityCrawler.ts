import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Browser headers to avoid being blocked
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

interface CommunityContent {
  title: string;
  content: string;
  author?: string;
  votes?: number;
  url: string;
  platform: string;
  source: string;
  contentType: 'community' | 'user_generated';
  category: string;
}

// Platform-specific configurations for community content
const COMMUNITY_CONFIGS = {
  airbnb_community: {
    name: 'Airbnb',
    baseUrl: 'https://community.withairbnb.com',
    selectors: {
      title: 'h1, .c-article-title, .article-title, .message-title',
      content: '.c-article-content, .article-content, .message-body, .message-content',
      author: '.author-name, .user-name, .c-article-author, .message-author',
      votes: '.vote-count, .rating, .score, .message-rating',
    },
    category: 'Community Discussion',
  },
  quora: {
    name: 'Quora',
    baseUrl: 'https://www.quora.com',
    selectors: {
      title: 'h1, .question-title, .q-text, .question-text',
      content: '.answer-content, .answer-text, .content, .answer-body',
      author: '.author-name, .answer-author, .user-name, .answerer-name',
      votes: '.vote-count, .upvotes, .rating, .answer-votes',
    },
    category: 'Quora Q&A',
  },
  booking_community: {
    name: 'Booking.com',
    baseUrl: 'https://partner.booking.com',
    selectors: {
      title: 'h1, .article-title, .post-title, .discussion-title',
      content: '.article-content, .post-content, .discussion-content, .message-body',
      author: '.author-name, .post-author, .user-name, .message-author',
      votes: '.vote-count, .rating, .score, .post-rating',
    },
    category: 'Partner Community',
  },
};

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to get random delay between 3-8 seconds (more conservative for community sites)
const getRandomDelay = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper function to clean and validate content
function cleanContent(content: string): string {
  return content
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,!?-]/g, '')
    .trim();
}

// Helper function to extract votes from text
function extractVotes(voteText: string): number {
  const match = voteText.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// Helper function to determine platform from URL
function getPlatformFromUrl(url: string): string {
  if (url.includes('airbnb.com')) return 'Airbnb';
  if (url.includes('booking.com')) return 'Booking.com';
  if (url.includes('getyourguide.com')) return 'GetYourGuide';
  if (url.includes('viator.com')) return 'Viator';
  if (url.includes('expedia.com')) return 'Expedia';
  return 'Other';
}

// Helper function to determine source from URL
function getSourceFromUrl(url: string): string {
  if (url.includes('community.withairbnb.com')) return 'community';
  if (url.includes('partner.booking.com')) return 'community';
  if (url.includes('quora.com')) return 'quora';
  return 'blog';
}

async function scrapeCommunityPage(url: string, config: any): Promise<CommunityContent | null> {
  try {
    console.log(`[COMMUNITY] Scraping ${url} (${config.name})`);
    
    const response = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: 15000,
    });

    if (response.status !== 200) {
      console.log(`[COMMUNITY][WARN] Non-200 status code (${response.status}) for ${url}`);
      return null;
    }

    const $ = cheerio.load(response.data);
    
    // Extract content using selectors
    const title = $(config.selectors.title).first().text().trim();
    const content = $(config.selectors.content).first().text().trim();
    const author = $(config.selectors.author).first().text().trim();
    const voteText = $(config.selectors.votes).first().text().trim();
    
    if (!title || !content || content.length < 50) {
      console.log(`[COMMUNITY][WARN] Invalid content for ${url}`);
      console.log(`[COMMUNITY][DEBUG] Title: "${title}"`);
      console.log(`[COMMUNITY][DEBUG] Content length: ${content.length}`);
      return null;
    }

    const cleanedContent = cleanContent(content);
    const votes = extractVotes(voteText);
    const platform = getPlatformFromUrl(url);
    const source = getSourceFromUrl(url);
    
    return {
      title,
      content: cleanedContent,
      author: author || undefined,
      votes,
      url,
      platform,
      source,
      contentType: 'community',
      category: config.category,
    };
  } catch (error: any) {
    // Handle specific error types
    if (error.response?.status === 403) {
      console.log(`[COMMUNITY][BLOCKED] Access blocked (403) for ${url} - likely anti-bot protection`);
      return null;
    } else if (error.response?.status === 404) {
      console.log(`[COMMUNITY][NOT_FOUND] Page not found (404) for ${url}`);
      return null;
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`[COMMUNITY][CONNECTION] Connection refused for ${url}`);
      return null;
    } else if (error.code === 'ETIMEDOUT') {
      console.log(`[COMMUNITY][TIMEOUT] Request timeout for ${url}`);
      return null;
    } else {
      console.error(`[COMMUNITY] Error scraping ${url}:`, error.message);
      return null;
    }
  }
}

// Store community content in database
async function storeCommunityContent(content: CommunityContent): Promise<void> {
  try {
    // Create paragraphs for embedding (similar to official content)
    const paragraphs = content.content
      .split(/\n+/)
      .filter(p => p.trim().length > 50)
      .slice(0, 5); // Limit to 5 paragraphs

    await prisma.article.upsert({
      where: { url: content.url },
      create: {
        url: content.url,
        question: content.title,
        answer: content.content,
        category: content.category,
        platform: content.platform,
        contentType: content.contentType,
        source: content.source,
        author: content.author,
        votes: content.votes || 0,
        isVerified: (content.votes || 0) > 10, // Auto-verify high-voted content
        paragraphs: {
          create: paragraphs.map(text => ({
            text,
            embedding: [], // Will be populated by embedding service
          })),
        },
      },
      update: {
        question: content.title,
        answer: content.content,
        category: content.category,
        platform: content.platform,
        contentType: content.contentType,
        source: content.source,
        author: content.author,
        votes: content.votes || 0,
        isVerified: (content.votes || 0) > 10,
        lastUpdated: new Date(),
      },
    });

    console.log(`[COMMUNITY] Successfully stored: ${content.url}`);
  } catch (error) {
    console.error(`[COMMUNITY] Error storing content:`, error);
  }
}

// Helper function to get config for a URL
function getConfigForUrl(url: string): any {
  if (url.includes('community.withairbnb.com')) {
    return COMMUNITY_CONFIGS.airbnb_community;
  } else if (url.includes('quora.com')) {
    return COMMUNITY_CONFIGS.quora;
  } else if (url.includes('partner.booking.com')) {
    return COMMUNITY_CONFIGS.booking_community;
  }
  return null;
}

/**
 * Community Content Crawler
 * 
 * Crawls user-generated content from community platforms like:
 * - Airbnb Community (community.withairbnb.com)
 * - Quora (quora.com) 
 * - Booking.com Partner Community (partner.booking.com)
 * 
 * Note: Reddit is excluded due to anti-bot protection (403 errors)
 * To add Reddit support, would need:
 * - Reddit API integration
 * - User agent rotation
 * - Rate limiting
 * - Authentication
 */

// Main function to scrape community URLs
export async function scrapeCommunityUrls(urls: string[]): Promise<void> {
  console.log(`[COMMUNITY] Starting community content scraping for ${urls.length} URLs`);
  
  const results: CommunityContent[] = [];
  
  for (const url of urls) {
    try {
      const config = getConfigForUrl(url);
      if (!config) {
        console.log(`[COMMUNITY][WARN] No config found for URL: ${url}`);
        continue;
      }
      
      const content = await scrapeCommunityPage(url, config);
      if (content) {
        results.push(content);
      }
    } catch (error) {
      console.error(`[COMMUNITY] Failed to scrape ${url}:`, error);
    }
  }
  
  if (results.length === 0) {
    console.log(`[COMMUNITY] No valid content found from ${urls.length} URLs`);
    console.log(`[COMMUNITY] This is expected if using example URLs. Replace with real URLs for production.`);
    return;
  }
  
  console.log(`[COMMUNITY] Successfully scraped ${results.length}/${urls.length} URLs`);
  
  // Save to database
  for (const content of results) {
    try {
      await storeCommunityContent(content);
      console.log(`[COMMUNITY] Saved: ${content.title.substring(0, 50)}...`);
    } catch (error) {
      console.error(`[COMMUNITY] Failed to save content:`, error);
    }
  }
  
  console.log(`[COMMUNITY] Community scraping completed. Saved ${results.length} articles.`);
}

// Function to get community content URLs (to be called from admin)
export async function getCommunityContentUrls(): Promise<string[]> {
  // Example community URLs for testing
  const COMMUNITY_URLS = [
    // Airbnb Community - these would need to be replaced with actual Airbnb Community URLs
    'https://community.withairbnb.com/t5/Hosting/Payout-delay-issues/td-p/123458',
    'https://community.withairbnb.com/t5/Guest-Questions/Check-in-problems/td-p/123459',
    'https://community.withairbnb.com/t5/Hosting/How-to-handle-difficult-guests/td-p/123460',
    
    // Booking Community - these would need to be replaced with actual Booking.com URLs
    'https://partner.booking.com/discussion/example1',
    'https://partner.booking.com/discussion/example2',
    'https://partner.booking.com/discussion/example3',
    
    // Quora - these would need to be replaced with actual Quora URLs
    'https://www.quora.com/What-are-the-best-Airbnb-hosting-tips',
    'https://www.quora.com/How-do-I-deal-with-problematic-Airbnb-guests',
    'https://www.quora.com/What-are-common-Airbnb-host-mistakes',
  ];

  return COMMUNITY_URLS;
} 