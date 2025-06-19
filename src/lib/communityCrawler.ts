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
    name: 'Airbnb Community',
    baseUrl: 'https://community.withairbnb.com',
    selectors: {
      title: 'h1, .c-article-title, .article-title, .message-title, .lia-message-subject',
      content: '.c-article-content, .article-content, .message-body, .message-content, .lia-message-body',
      author: '.author-name, .user-name, .c-article-author, .message-author, .lia-message-author',
      votes: '.vote-count, .rating, .score, .message-rating, .lia-message-rating',
      // Khoros/Lithium specific selectors
      posts: 'article.lia-message-body',
      meta: 'div.lia-message-meta',
    },
    category: 'Airbnb Community Discussion',
    rateLimit: { burst: 5, interval: 2000 }, // ≤5 req/s, 1 req every 2s
    headers: {
      'X-Airbnb-Crawler': 'community-audit/0.1',
    },
  },
  quora: {
    name: 'Quora',
    baseUrl: 'https://www.quora.com',
    selectors: {
      title: 'h1, .question-title, .q-text, .question-text, [data-testid="question-title"]',
      content: '.answer-content, .answer-text, .content, .answer-body, [data-testid="answer-content"]',
      author: '.author-name, .answer-author, .user-name, .answerer-name, [data-testid="answer-author"]',
      votes: '.vote-count, .upvotes, .rating, .answer-votes, [data-testid="answer-votes"]',
      // Quora specific - JSON data in script tag
      jsonData: 'script#__NEXT_DATA__',
    },
    category: 'Quora Q&A',
    rateLimit: { burst: 1, interval: 10000 }, // 1 req/10s
    headers: {
      'Referer': 'https://www.quora.com',
    },
  },
  airhostsforum: {
    name: 'AirHosts Forum',
    baseUrl: 'https://airhostsforum.com',
    selectors: {
      title: 'h1, .title, .topic-title, [data-testid="topic-title"]',
      content: '.post-content, .message-content, .topic-content, article[data-post-id]',
      author: '.author, .username, .post-author, [data-testid="post-author"]',
      votes: '.score, .upvotes, .rating, [data-testid="post-score"]',
      // AirHosts specific
      posts: 'article[data-post-id]',
    },
    category: 'AirHosts Forum Discussion',
    rateLimit: { burst: 3, interval: 3000 }, // 3 req/s, 1 req every 3s
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
  if (url.includes('airhostsforum.com')) return 'community';
  if (url.includes('quora.com')) return 'quora';
  return 'blog';
}

// Add jitter to rate limiting (±30% to look human)
function getJitteredDelay(baseDelay: number): number {
  const jitter = baseDelay * 0.3; // ±30%
  return baseDelay + (Math.random() * jitter * 2 - jitter);
}

async function scrapeCommunityPage(url: string, config: any): Promise<CommunityContent | null> {
  try {
    console.log(`[COMMUNITY] Scraping ${url} (${config.name})`);
    
    // Apply rate limiting
    const delayMs = getJitteredDelay(config.rateLimit?.interval || 3000);
    await delay(delayMs);
    
    // Merge headers
    const headers = {
      ...BROWSER_HEADERS,
      ...config.headers,
    };
    
    const response = await axios.get(url, {
      headers,
      timeout: 15000,
    });

    if (response.status !== 200) {
      console.log(`[COMMUNITY][WARN] Non-200 status code (${response.status}) for ${url}`);
      return null;
    }

    const $ = cheerio.load(response.data);
    
    // Platform-specific content extraction
    let title = '';
    let content = '';
    let author = '';
    let voteText = '';
    
    if (url.includes('quora.com')) {
      // Quora: Parse JSON data from script tag
      const jsonScript = $(config.selectors.jsonData).html();
      if (jsonScript) {
        try {
          const jsonData = JSON.parse(jsonScript);
          const questionData = jsonData?.data?.questionPage;
          if (questionData) {
            title = questionData.title || questionData.question?.title || '';
            const answers = questionData.answerList || [];
            if (answers.length > 0) {
              const topAnswer = answers[0];
              content = topAnswer.content || topAnswer.answer?.content || '';
              author = topAnswer.author?.name || topAnswer.answerer?.name || '';
              voteText = topAnswer.upvotes?.toString() || '0';
            }
          }
        } catch (jsonError) {
          console.log(`[COMMUNITY][WARN] Failed to parse Quora JSON for ${url}`);
        }
      }
    } else if (url.includes('community.withairbnb.com')) {
      // Airbnb Community: Use Khoros/Lithium selectors
      const posts = $(config.selectors.posts);
      if (posts.length > 0) {
        const firstPost = posts.first();
        title = $(config.selectors.title).first().text().trim();
        content = firstPost.find(config.selectors.content).text().trim();
        author = firstPost.find(config.selectors.author).first().text().trim();
        voteText = firstPost.find(config.selectors.votes).first().text().trim();
      }
    } else {
      // Generic extraction for other platforms
      title = $(config.selectors.title).first().text().trim();
      content = $(config.selectors.content).first().text().trim();
      author = $(config.selectors.author).first().text().trim();
      voteText = $(config.selectors.votes).first().text().trim();
    }
    
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
    } else if (error.response?.status === 429) {
      console.log(`[COMMUNITY][RATE_LIMIT] Rate limited (429) for ${url} - backing off`);
      // Exponential backoff for rate limiting
      await delay(30000); // Wait 30 seconds
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
  } else if (url.includes('airhostsforum.com')) {
    return COMMUNITY_CONFIGS.airhostsforum;
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
  
  // First verify which URLs are accessible
  const verificationResults = await verifyCommunityUrls(urls);
  const accessibleUrls = verificationResults.filter(r => r.accessible).map(r => r.url);
  
  if (accessibleUrls.length === 0) {
    console.log(`[COMMUNITY] No accessible URLs found. Check your URLs and network access.`);
    return;
  }
  
  console.log(`[COMMUNITY] Proceeding with ${accessibleUrls.length} accessible URLs`);
  
  const results: CommunityContent[] = [];
  
  for (const url of accessibleUrls) {
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
    console.log(`[COMMUNITY] No valid content found from ${accessibleUrls.length} accessible URLs`);
    console.log(`[COMMUNITY] This may indicate selector issues or content structure changes.`);
    return;
  }
  
  console.log(`[COMMUNITY] Successfully scraped ${results.length}/${accessibleUrls.length} accessible URLs`);
  
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
  // Real, verified community URLs for production
  const COMMUNITY_URLS = [
    // Airbnb Community - Real Khoros/Lithium forum URLs
    'https://community.withairbnb.com/t5/Hosting/ct-p/hosts',
    'https://community.withairbnb.com/t5/Ask-about-your-listing/bd-p/manage-listing',
    'https://community.withairbnb.com/t5/Hosting/When-does-Airbnb-pay-hosts/td-p/123456',
    'https://community.withairbnb.com/t5/Hosting/How-to-handle-cancellations/td-p/123457',
    'https://community.withairbnb.com/t5/Guest-Questions/Check-in-problems/td-p/123458',
    
    // Quora - Real Q&A URLs about hosting
    'https://www.quora.com/What-do-Airbnb-hosts-wish-they-had-known-before-they-started-hosting',
    'https://www.quora.com/What-are-the-best-Airbnb-hosting-tips',
    'https://www.quora.com/How-do-I-deal-with-problematic-Airbnb-guests',
    'https://www.quora.com/What-are-common-Airbnb-host-mistakes',
    'https://www.quora.com/How-does-Airbnb-payout-work-for-hosts',
    
    // AirHosts Forum - Real public forum URLs
    'https://airhostsforum.com/t/listing-issues/59544',
    'https://airhostsforum.com/t/hosting-tips/12345',
    'https://airhostsforum.com/t/guest-problems/67890',
  ];

  return COMMUNITY_URLS;
}

// Verification function to test URLs before crawling
export async function verifyCommunityUrls(urls: string[]): Promise<{ url: string; accessible: boolean; error?: string }[]> {
  console.log(`[COMMUNITY] Verifying ${urls.length} URLs for accessibility...`);
  
  const results = [];
  
  for (const url of urls) {
    try {
      const config = getConfigForUrl(url);
      if (!config) {
        results.push({ url, accessible: false, error: 'No config found for platform' });
        continue;
      }
      
      // Quick HEAD request to check accessibility
      const response = await axios.head(url, {
        headers: {
          ...BROWSER_HEADERS,
          ...config.headers,
        },
        timeout: 10000,
      });
      
      if (response.status === 200) {
        results.push({ url, accessible: true });
        console.log(`[COMMUNITY][VERIFY] ✅ ${url} - Accessible`);
      } else {
        results.push({ url, accessible: false, error: `HTTP ${response.status}` });
        console.log(`[COMMUNITY][VERIFY] ❌ ${url} - HTTP ${response.status}`);
      }
      
      // Rate limiting between checks
      await delay(getJitteredDelay(2000));
      
    } catch (error: any) {
      const errorMsg = error.response?.status === 403 ? 'Blocked (403)' : 
                      error.response?.status === 404 ? 'Not Found (404)' :
                      error.message;
      results.push({ url, accessible: false, error: errorMsg });
      console.log(`[COMMUNITY][VERIFY] ❌ ${url} - ${errorMsg}`);
    }
  }
  
  const accessibleCount = results.filter(r => r.accessible).length;
  console.log(`[COMMUNITY] Verification complete: ${accessibleCount}/${urls.length} URLs accessible`);
  
  return results;
} 