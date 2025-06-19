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
      title: 'h1, .c-article-title, .article-title',
      content: '.c-article-content, .article-content, .message-body',
      author: '.author-name, .user-name, .c-article-author',
      votes: '.vote-count, .rating, .score',
    },
    category: 'Community Discussion',
  },
  reddit: {
    name: 'Reddit',
    baseUrl: 'https://www.reddit.com',
    selectors: {
      title: 'h1, .title, [data-testid="post-title"]',
      content: '.content, .post-content, [data-testid="post-content"]',
      author: '.author, .username, [data-testid="post-author"]',
      votes: '.score, .upvotes, [data-testid="post-score"]',
    },
    category: 'Reddit Discussion',
  },
  quora: {
    name: 'Quora',
    baseUrl: 'https://www.quora.com',
    selectors: {
      title: 'h1, .question-title, .q-text',
      content: '.answer-content, .answer-text, .content',
      author: '.author-name, .answer-author, .user-name',
      votes: '.vote-count, .upvotes, .rating',
    },
    category: 'Quora Q&A',
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
  if (url.includes('reddit.com')) return 'reddit';
  if (url.includes('quora.com')) return 'quora';
  if (url.includes('partner.booking.com')) return 'community';
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
  } catch (error) {
    console.error(`[COMMUNITY] Error scraping ${url}:`, error);
    return null;
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

// Main function to scrape community URLs
export async function scrapeCommunityUrls(urls: string[]): Promise<void> {
  console.log(`[COMMUNITY] Starting scrape of ${urls.length} community URLs`);
  
  for (const url of urls) {
    try {
      // Determine which config to use based on URL
      let config = null;
      if (url.includes('community.withairbnb.com')) {
        config = COMMUNITY_CONFIGS.airbnb_community;
      } else if (url.includes('reddit.com')) {
        config = COMMUNITY_CONFIGS.reddit;
      } else if (url.includes('quora.com')) {
        config = COMMUNITY_CONFIGS.quora;
      }
      
      if (!config) {
        console.log(`[COMMUNITY][WARN] No config found for URL: ${url}`);
        continue;
      }
      
      const content = await scrapeCommunityPage(url, config);
      if (content) {
        await storeCommunityContent(content);
      }
      
      // Add a random delay between 3-8 seconds to be respectful
      await delay(getRandomDelay(3000, 8000));
    } catch (error) {
      console.error(`[COMMUNITY] Error processing ${url}:`, error);
    }
  }
  
  console.log('[COMMUNITY] Community scrape process completed');
}

// Function to get community content URLs (to be called from admin)
export async function getCommunityContentUrls(): Promise<string[]> {
  // This would be populated with actual community URLs
  // For now, returning a sample set
  return [
    // Airbnb Community
    'https://community.withairbnb.com/t5/Hosting/When-does-Airbnb-pay-hosts/td-p/123456',
    'https://community.withairbnb.com/t5/Hosting/How-to-handle-cancellations/td-p/123457',
    
    // Reddit (example URLs - would need actual Reddit API or specific subreddit URLs)
    'https://www.reddit.com/r/Airbnb/comments/example1',
    'https://www.reddit.com/r/TravelHacks/comments/example2',
    
    // Quora (example URLs)
    'https://www.quora.com/How-does-Airbnb-payout-work-for-hosts',
    'https://www.quora.com/What-are-the-best-practices-for-Airbnb-hosting',
  ];
} 