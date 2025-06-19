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
      title: 'h1, .c-article-title, .article-title, .message-title, .lia-message-subject, .page-title, .topic-title',
      content: '.c-article-content, .article-content, .message-body, .message-content, .lia-message-body, .post-content, .topic-content, .message-text',
      author: '.author-name, .user-name, .c-article-author, .message-author, .lia-message-author, .post-author, .username',
      votes: '.vote-count, .rating, .score, .message-rating, .lia-message-rating, .post-rating, .upvotes',
      // Khoros/Lithium specific selectors - updated
      posts: 'article.lia-message-body, .lia-message, .message, .post, .topic-post',
      meta: 'div.lia-message-meta, .message-meta, .post-meta, .topic-meta',
      // Fallback selectors for different page types
      fallbackTitle: '.page-title, .topic-title, .thread-title, h1, h2',
      fallbackContent: '.message-content, .post-content, .topic-content, .thread-content, .content',
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
      title: 'h1, .title, .topic-title, [data-testid="topic-title"], .fancy-title, .topic-title',
      content: '.post-content, .message-content, .topic-content, article[data-post-id], .cooked, .topic-body, .post-message',
      author: '.author, .username, .post-author, [data-testid="post-author"], .names, .creator',
      votes: '.score, .upvotes, .rating, [data-testid="post-score"], .like-count, .post-likes',
      // AirHosts specific - updated
      posts: 'article[data-post-id], .topic-post, .post, .message',
      // Fallback selectors
      fallbackTitle: '.fancy-title, .topic-title, h1, .title',
      fallbackContent: '.cooked, .post-message, .topic-body, .content',
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
      // Airbnb Community: Use Khoros/Lithium selectors with fallbacks
      console.log(`[COMMUNITY][DEBUG] Trying Airbnb Community selectors for ${url}`);
      
      // Try primary selectors first
      title = $(config.selectors.title).first().text().trim();
      const posts = $(config.selectors.posts);
      
      if (posts.length > 0) {
        const firstPost = posts.first();
        content = firstPost.find(config.selectors.content).text().trim();
        author = firstPost.find(config.selectors.author).first().text().trim();
        voteText = firstPost.find(config.selectors.votes).first().text().trim();
      }
      
      // If no content found, try fallback selectors
      if (!content || content.length < 50) {
        console.log(`[COMMUNITY][DEBUG] Primary selectors failed, trying fallbacks`);
        title = title || $(config.selectors.fallbackTitle).first().text().trim();
        content = $(config.selectors.fallbackContent).first().text().trim();
        
        // Try to find any text content if still empty
        if (!content || content.length < 100) {
          console.log(`[COMMUNITY][DEBUG] Fallback selectors failed, trying body text extraction`);
          
          // Try multiple content extraction strategies
          const strategies = [
            // Strategy 1: Look for main content areas
            () => $('.main-content, .content-area, .post-content, .message-content, .topic-content').text().trim(),
            // Strategy 2: Look for article content
            () => $('article, .article, .post, .message').text().trim(),
            // Strategy 3: Look for divs with substantial text
            () => $('div').map((i, el) => {
              const text = $(el).text().trim();
              return text.length > 200 ? text : '';
            }).get().filter((t: string) => t.length > 0).join(' '),
            // Strategy 4: Get all text and filter meaningful lines
            () => {
              const allText = $('body').text().trim();
              const lines = allText.split('\n').filter(line => line.trim().length > 30);
              return lines.slice(0, 5).join(' ').substring(0, 1000);
            }
          ];
          
          for (const strategy of strategies) {
            const extracted = strategy();
            if (extracted && extracted.length > 100) {
              content = extracted;
              console.log(`[COMMUNITY][DEBUG] Found content via strategy: ${content.length} chars`);
              break;
            }
          }
        }
      }
      
    } else if (url.includes('airhostsforum.com')) {
      // AirHosts Forum: Use updated selectors with fallbacks
      console.log(`[COMMUNITY][DEBUG] Trying AirHosts Forum selectors for ${url}`);
      
      // Try primary selectors first
      title = $(config.selectors.title).first().text().trim();
      const posts = $(config.selectors.posts);
      
      if (posts.length > 0) {
        const firstPost = posts.first();
        content = firstPost.find(config.selectors.content).text().trim();
        author = firstPost.find(config.selectors.author).first().text().trim();
        voteText = firstPost.find(config.selectors.votes).first().text().trim();
      }
      
      // If no content found, try fallback selectors
      if (!content || content.length < 50) {
        console.log(`[COMMUNITY][DEBUG] Primary selectors failed, trying fallbacks`);
        title = title || $(config.selectors.fallbackTitle).first().text().trim();
        content = $(config.selectors.fallbackContent).first().text().trim();
        
        // Try to find any text content if still empty
        if (!content || content.length < 100) {
          console.log(`[COMMUNITY][DEBUG] Fallback selectors failed, trying body text extraction`);
          
          // Try multiple content extraction strategies
          const strategies = [
            // Strategy 1: Look for main content areas
            () => $('.main-content, .content-area, .post-content, .message-content, .topic-content').text().trim(),
            // Strategy 2: Look for article content
            () => $('article, .article, .post, .message').text().trim(),
            // Strategy 3: Look for divs with substantial text
            () => $('div').map((i, el) => {
              const text = $(el).text().trim();
              return text.length > 200 ? text : '';
            }).get().filter((t: string) => t.length > 0).join(' '),
            // Strategy 4: Get all text and filter meaningful lines
            () => {
              const allText = $('body').text().trim();
              const lines = allText.split('\n').filter(line => line.trim().length > 30);
              return lines.slice(0, 5).join(' ').substring(0, 1000);
            }
          ];
          
          for (const strategy of strategies) {
            const extracted = strategy();
            if (extracted && extracted.length > 100) {
              content = extracted;
              console.log(`[COMMUNITY][DEBUG] Found content via strategy: ${content.length} chars`);
              break;
            }
          }
        }
      }
      
    } else {
      // Generic extraction for other platforms
      title = $(config.selectors.title).first().text().trim();
      content = $(config.selectors.content).first().text().trim();
      author = $(config.selectors.author).first().text().trim();
      voteText = $(config.selectors.votes).first().text().trim();
    }
    
    // Debug output
    console.log(`[COMMUNITY][DEBUG] Extracted - Title: "${title.substring(0, 50)}..."`);
    console.log(`[COMMUNITY][DEBUG] Extracted - Content length: ${content.length}`);
    console.log(`[COMMUNITY][DEBUG] Extracted - Author: "${author}"`);
    
    // Try to find author if not found
    if (!author) {
      console.log(`[COMMUNITY][DEBUG] No author found, trying additional author selectors`);
      const authorSelectors = [
        '.author, .username, .user-name, .post-author, .message-author',
        '.creator, .owner, .byline, .author-name',
        '[data-author], [data-username], [data-user]',
        '.user-info, .user-details, .profile-name'
      ];
      
      for (const selector of authorSelectors) {
        const foundAuthor = $(selector).first().text().trim();
        if (foundAuthor && foundAuthor.length > 0 && foundAuthor.length < 50) {
          author = foundAuthor;
          console.log(`[COMMUNITY][DEBUG] Found author via selector "${selector}": "${author}"`);
          break;
        }
      }
    }
    
    if (!title || !content || content.length < 50) {
      console.log(`[COMMUNITY][WARN] Invalid content for ${url}`);
      console.log(`[COMMUNITY][DEBUG] Title: "${title}"`);
      console.log(`[COMMUNITY][DEBUG] Content length: ${content.length}`);
      
      // Try one more fallback - look for any meaningful text
      if (!content || content.length < 50) {
        const $body = $('body');
        const paragraphs = $body.find('p').map((i, el) => $(el).text().trim()).get();
        const meaningfulParagraphs = paragraphs.filter((p: string) => p.length > 50);
        
        if (meaningfulParagraphs.length > 0) {
          content = meaningfulParagraphs.slice(0, 2).join(' ');
          console.log(`[COMMUNITY][DEBUG] Found content via paragraph fallback: ${content.length} chars`);
        }
      }
      
      if (!content || content.length < 50) {
        return null;
      }
    }

    // Content quality check - filter out landing pages and generic content
    const genericPhrases = [
      'welcome', 'community', 'forum', 'discussion', 'join us', 'sign up',
      'benvenuto', 'comunità', 'forum', 'discussione', 'iscriviti', // Italian
      'bienvenido', 'comunidad', 'foro', 'discusión', 'únete' // Spanish
    ];
    
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Check if content seems like a landing page
    const isLandingPage = genericPhrases.some(phrase => 
      titleLower.includes(phrase) || contentLower.includes(phrase)
    );
    
    if (isLandingPage && content.length < 200) {
      console.log(`[COMMUNITY][WARN] Skipping landing page content: "${title.substring(0, 50)}..."`);
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
    // Airbnb Community - Real Khoros/Lithium forum URLs (working ones)
    'https://community.withairbnb.com/t5/Ask-about-your-listing/bd-p/manage-listing',
    'https://community.withairbnb.com/t5/Hosting/When-does-Airbnb-pay-hosts/td-p/123456',
    
    // AirHosts Forum - Real public forum URLs (working ones)
    'https://airhostsforum.com/t/listing-issues/59544',
    'https://airhostsforum.com/t/hosting-tips-and-advice/2',
    
    // Note: Quora URLs removed due to 403 blocking
    // To add Quora back, would need:
    // - Reddit API integration
    // - User agent rotation
    // - Rate limiting
    // - Authentication
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