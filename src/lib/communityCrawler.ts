import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from "@prisma/client";
import { detectLanguage } from '../utils/languageDetection';
import { slugify } from '@/utils/slugify';

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
  postsExtracted?: number;
  repliesExtracted?: number;
  totalCharacters?: number;
}

// Platform-specific configurations for community content
const COMMUNITY_CONFIGS = {
  airbnb_community: {
    name: 'Airbnb Community',
    baseUrl: 'https://community.withairbnb.com',
    selectors: {
      // Updated Airbnb Community selectors based on Khoros/Lithium structure
      title: '.lia-message-subject, .page-title, .topic-title, h1, .lia-message-subject a',
      // Main content area where OP and replies live
      content: '.lia-message-body-content, .lia-message-body',
      // Author information
      author: '.lia-user-name, .author-name, .user-name, .lia-user-name a',
      // Date/time information
      date: 'time[datetime], .lia-message-date, .post-date',
      // Individual posts/replies - updated selectors
      posts: '.lia-message-body, .lia-message, .message-body, article.lia-message-body',
      // Post content within each message
      postContent: '.lia-message-body-content, .message-content, .post-content',
      // Post author within each message
      postAuthor: '.lia-user-name, .author-name, .user-name, .lia-user-name a',
      // Post date within each message
      postDate: 'time[datetime], .lia-message-date, .post-date',
      // Fallback selectors
      fallbackTitle: '.page-title, .topic-title, h1, h2, .lia-message-subject',
      fallbackContent: '.message-content, .post-content, .topic-content, .content, .lia-message-body',
      // New selectors for better extraction
      threadTitle: '.lia-message-subject, .topic-title, h1',
      threadContent: '.lia-message-body-content, .lia-message-body',
      threadAuthor: '.lia-user-name, .author-name',
      // Meta selectors for fallback
      metaTitle: 'meta[property="og:title"], meta[name="title"]',
      metaDescription: 'meta[property="og:description"], meta[name="description"]',
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
      title: '.fancy-title, .topic-title, h1, .title',
      content: '.cooked, .post-message, .topic-body, .content',
      author: '.names, .creator, .author, .username',
      votes: '.score, .upvotes, .rating, .like-count',
      // AirHosts specific - updated for Discourse structure
      posts: 'article[data-post-id], .topic-post, .post, .message',
      postContent: '.cooked, .post-message, .topic-body',
      postAuthor: '.names, .creator, .author',
      postDate: '.post-date, .date, time',
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

// Function to check if URL is a category listing page (should be skipped)
function isCategoryListingPage(url: string): boolean {
  // Airbnb Community category listing patterns
  if (url.includes('community.withairbnb.com')) {
    // Skip URLs ending with /bd-p/* (board pages)
    if (url.includes('/bd-p/')) {
      return true;
    }
    // Skip URLs that don't match thread pattern /t5/*/td-p/*
    if (!url.match(/\/t5\/.*\/td-p\/\d+/)) {
      return true;
    }
  }
  
  // AirHosts Forum category listing patterns
  if (url.includes('airhostsforum.com')) {
    // Skip URLs that don't have a topic ID
    if (!url.match(/\/t\/.*\/\d+/)) {
      return true;
    }
  }
  
  return false;
}

async function scrapeCommunityPage(url: string, config: any): Promise<CommunityContent | null> {
  try {
    console.log(`[COMMUNITY] Scraping ${url} (${config.name})`);
    
    // Check if this is a category listing page that should be skipped
    if (isCategoryListingPage(url)) {
      console.log(`[COMMUNITY][SKIP] Skipping category listing page: ${url}`);
      return null;
    }
    
    // Apply rate limiting
    const delayMs = getJitteredDelay(config.rateLimit?.interval || 3000);
    await delay(delayMs);
    
    // Merge headers
    const headers = {
      ...BROWSER_HEADERS,
      ...config.headers,
    };
    
    let response;
    let $;
    
    // Special handling for AirHosts Forum JSON API
    if (url.includes('airhostsforum.com')) {
      try {
        // Try JSON API first
        const jsonUrl = url.endsWith('.json') ? url : url + '.json';
        console.log(`[COMMUNITY][AIRHOSTS] Trying JSON API: ${jsonUrl}`);
        
        response = await axios.get(jsonUrl, {
          headers,
          timeout: 15000,
        });
        
        if (response.status === 200 && response.data) {
          console.log(`[COMMUNITY][AIRHOSTS] JSON API successful`);
          return await parseAirHostsJson(response.data, url, config);
        }
      } catch (jsonError: any) {
        console.log(`[COMMUNITY][AIRHOSTS] JSON API failed, falling back to HTML: ${jsonError.message}`);
      }
    }
    
    // Fallback to HTML scraping
    response = await axios.get(url, {
      headers,
      timeout: 15000,
    });

    if (response.status !== 200) {
      console.log(`[COMMUNITY][WARN] Non-200 status code (${response.status}) for ${url}`);
      return null;
    }

    $ = cheerio.load(response.data);
    
    // Platform-specific content extraction
    let title = '';
    let content = '';
    let author = '';
    let voteText = '';
    let postsExtracted = 0;
    let repliesExtracted = 0;
    
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
              postsExtracted = 1;
            }
          }
        } catch (jsonError) {
          console.log(`[COMMUNITY][WARN] Failed to parse Quora JSON for ${url}`);
        }
      }
    } else if (url.includes('community.withairbnb.com')) {
      // Airbnb Community: Use updated Khoros/Lithium selectors with redirect handling
      console.log(`[COMMUNITY][AIRBNB] Using updated Airbnb Community selectors for ${url}`);
      
      // Check for redirects by comparing URL with canonical URL
      const canonicalUrl = $('link[rel="canonical"]').attr('href');
      const metaTitle = $('meta[property="og:title"]').attr('content') || '';
      const pageTitle = $('title').text() || '';
      
      if (canonicalUrl && canonicalUrl !== url) {
        console.log(`[COMMUNITY][AIRBNB] Detected redirect: ${url} -> ${canonicalUrl}`);
        
        // Check if the content is in a different language (common redirect issue)
        if (metaTitle.includes('Douchescherm') || pageTitle.includes('Douchescherm')) {
          console.log(`[COMMUNITY][AIRBNB] Skipping content due to redirect to Dutch content (shower screen thread)`);
          return null;
        }
        
        // Check if the canonical URL has a different thread ID
        const originalThreadId = url.match(/td-p\/(\d+)/)?.[1];
        const canonicalThreadId = canonicalUrl.match(/td-p\/(\d+)/)?.[1];
        
        if (originalThreadId && canonicalThreadId && originalThreadId !== canonicalThreadId) {
          console.log(`[COMMUNITY][AIRBNB] Skipping content due to redirect to different thread (${originalThreadId} -> ${canonicalThreadId})`);
          return null;
        }
      }
      
      // Extract title with multiple fallbacks
      title = $(config.selectors.title).first().text().trim();
      if (!title) {
        title = $(config.selectors.threadTitle).first().text().trim();
      }
      if (!title) {
        // Try meta tags as fallback
        const metaTitle = $(config.selectors.metaTitle).attr('content');
        if (metaTitle) {
          title = metaTitle.replace(' - Airbnb Community', '').replace('Re: ', '');
        }
      }
      console.log(`[COMMUNITY][AIRBNB] Title extracted: "${title.substring(0, 50)}..."`);
      
      // Extract all posts/replies with improved selectors
      let posts = $(config.selectors.posts);
      if (posts.length === 0) {
        // Try alternative post selectors
        posts = $('.lia-message-body, .message-body, .post-body');
      }
      console.log(`[COMMUNITY][AIRBNB] Found ${posts.length} posts/replies`);
      
      const allContent: string[] = [];
      const allAuthors: string[] = [];
      
      posts.each((index, post) => {
        const $post = $(post);
        let postContent = $post.find(config.selectors.postContent).text().trim();
        
        // If no content found with specific selector, try broader selectors
        if (!postContent) {
          postContent = $post.text().trim();
        }
        
        let postAuthor = $post.find(config.selectors.postAuthor).first().text().trim();
        // If no author found, try parent elements
        if (!postAuthor) {
          postAuthor = $post.closest('.lia-message, .message, .post').find(config.selectors.postAuthor).first().text().trim();
        }
        
        const postDate = $post.find(config.selectors.postDate).first().attr('datetime') || 
                        $post.find(config.selectors.postDate).first().text().trim();
        
        if (postContent && postContent.length > 20) {
          allContent.push(postContent);
          if (postAuthor && postAuthor !== 'Anonymous') allAuthors.push(postAuthor);
          
          if (index === 0) {
            postsExtracted++;
            author = postAuthor;
          } else {
            repliesExtracted++;
          }
          
          console.log(`[COMMUNITY][AIRBNB] Post ${index + 1}: ${postContent.length} chars, author: "${postAuthor}", date: "${postDate}"`);
        }
      });
      
      // If no posts found with specific selectors, try broader content extraction
      if (allContent.length === 0) {
        console.log(`[COMMUNITY][AIRBNB] No posts found with specific selectors, trying broader extraction`);
        
        // Try to extract main content area
        const mainContent = $(config.selectors.content).first().text().trim();
        if (mainContent && mainContent.length > 50) {
          allContent.push(mainContent);
          postsExtracted = 1;
          console.log(`[COMMUNITY][AIRBNB] Found main content: ${mainContent.length} chars`);
        }
        
        // Try fallback content selectors
        if (allContent.length === 0) {
          const fallbackContent = $(config.selectors.fallbackContent).first().text().trim();
          if (fallbackContent && fallbackContent.length > 50) {
            allContent.push(fallbackContent);
            postsExtracted = 1;
            console.log(`[COMMUNITY][AIRBNB] Found content via fallback: ${fallbackContent.length} chars`);
          }
        }
      }
      
      // Concatenate all content for embedding
      content = allContent.join('\n\n');
      
      // If still no content, try meta description as last resort
      if (!content || content.length < 50) {
        console.log(`[COMMUNITY][AIRBNB] No content found, trying meta description`);
        const metaDescription = $(config.selectors.metaDescription).attr('content');
        if (metaDescription && metaDescription.length > 50) {
          content = metaDescription;
          postsExtracted = 1;
          console.log(`[COMMUNITY][AIRBNB] Using meta description: ${content.length} chars`);
        }
      }
      
      // Try to find author if not found
      if (!author || author === 'Anonymous') {
        console.log(`[COMMUNITY][AIRBNB] No author found, trying additional author selectors`);
        const authorSelectors = [
          '.lia-user-name a',
          '.author a',
          '.user-name a',
          '.post-author',
          '.message-author',
          '.creator',
          '.owner'
        ];
        
        for (const selector of authorSelectors) {
          const foundAuthor = $(selector).first().text().trim();
          if (foundAuthor && foundAuthor.length > 0 && foundAuthor.length < 50 && foundAuthor !== 'Anonymous') {
            author = foundAuthor;
            console.log(`[COMMUNITY][AIRBNB] Found author via selector "${selector}": "${author}"`);
            break;
          }
        }
      }
      
    } else if (url.includes('airhostsforum.com')) {
      // AirHosts Forum: Use updated Discourse selectors
      console.log(`[COMMUNITY][AIRHOSTS] Using updated AirHosts Forum selectors for ${url}`);
      
      // Extract title
      title = $(config.selectors.title).first().text().trim();
      console.log(`[COMMUNITY][AIRHOSTS] Title extracted: "${title.substring(0, 50)}..."`);
      
      // Extract all posts/replies
      const posts = $(config.selectors.posts);
      console.log(`[COMMUNITY][AIRHOSTS] Found ${posts.length} posts/replies`);
      
      const allContent: string[] = [];
      const allAuthors: string[] = [];
      
      posts.each((index, post) => {
        const $post = $(post);
        const postContent = $post.find(config.selectors.postContent).text().trim();
        const postAuthor = $post.find(config.selectors.postAuthor).first().text().trim();
        const postDate = $post.find(config.selectors.postDate).first().text().trim();
        
        if (postContent && postContent.length > 20) {
          allContent.push(postContent);
          if (postAuthor) allAuthors.push(postAuthor);
          
          if (index === 0) {
            postsExtracted++;
            author = postAuthor;
          } else {
            repliesExtracted++;
          }
          
          console.log(`[COMMUNITY][AIRHOSTS] Post ${index + 1}: ${postContent.length} chars, author: "${postAuthor}", date: "${postDate}"`);
        }
      });
      
      // Concatenate all content for embedding
      content = allContent.join('\n\n');
      
      // If no content found with specific selectors, try fallbacks
      if (!content || content.length < 50) {
        console.log(`[COMMUNITY][AIRHOSTS] Primary selectors failed, trying fallbacks`);
        title = title || $(config.selectors.fallbackTitle).first().text().trim();
        content = $(config.selectors.fallbackContent).first().text().trim();
        
        if (content && content.length > 50) {
          postsExtracted = 1;
          console.log(`[COMMUNITY][AIRHOSTS] Found content via fallback: ${content.length} chars`);
        }
      }
      
    } else {
      // Generic extraction for other platforms
      title = $(config.selectors.title).first().text().trim();
      content = $(config.selectors.content).first().text().trim();
      author = $(config.selectors.author).first().text().trim();
      voteText = $(config.selectors.votes).first().text().trim();
      postsExtracted = 1;
    }
    
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
      console.log(`[COMMUNITY][DEBUG] Posts extracted: ${postsExtracted}`);
      console.log(`[COMMUNITY][DEBUG] Replies extracted: ${repliesExtracted}`);
      return null;
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
    const totalCharacters = cleanedContent.length;
    
    // Log extraction statistics
    console.log(`[COMMUNITY][SUCCESS] Extraction complete for ${url}:`);
    console.log(`[COMMUNITY][SUCCESS] - Title: "${title.substring(0, 50)}..."`);
    console.log(`[COMMUNITY][SUCCESS] - Posts extracted: ${postsExtracted}`);
    console.log(`[COMMUNITY][SUCCESS] - Replies extracted: ${repliesExtracted}`);
    console.log(`[COMMUNITY][SUCCESS] - Total characters: ${totalCharacters}`);
    console.log(`[COMMUNITY][SUCCESS] - Author: "${author}"`);
    
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
      postsExtracted,
      repliesExtracted,
      totalCharacters,
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

// Function to parse AirHosts Forum JSON API response
async function parseAirHostsJson(jsonData: any, url: string, config: any): Promise<CommunityContent | null> {
  try {
    console.log(`[COMMUNITY][AIRHOSTS] Parsing JSON response`);
    
    const title = jsonData.title || jsonData.fancy_title || '';
    const posts = jsonData.post_stream?.posts || [];
    
    console.log(`[COMMUNITY][AIRHOSTS] Found ${posts.length} posts in JSON`);
    
    if (posts.length === 0) {
      console.log(`[COMMUNITY][AIRHOSTS] No posts found in JSON response`);
      return null;
    }
    
    const allContent: string[] = [];
    const allAuthors: string[] = [];
    let postsExtracted = 0;
    let repliesExtracted = 0;
    let author = '';
    
    posts.forEach((post: any, index: number) => {
      const postContent = post.cooked || '';
      const postAuthor = post.username || post.name || '';
      const postDate = post.created_at || '';
      
      if (postContent && postContent.length > 20) {
        // Convert HTML to text (basic conversion)
        const textContent = postContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (textContent.length > 20) {
          allContent.push(textContent);
          if (postAuthor) allAuthors.push(postAuthor);
          
          if (index === 0) {
            postsExtracted++;
            author = postAuthor;
          } else {
            repliesExtracted++;
          }
          
          console.log(`[COMMUNITY][AIRHOSTS] Post ${index + 1}: ${textContent.length} chars, author: "${postAuthor}", date: "${postDate}"`);
        }
      }
    });
    
    const content = allContent.join('\n\n');
    const totalCharacters = content.length;
    
    if (!title || !content || content.length < 50) {
      console.log(`[COMMUNITY][AIRHOSTS] Invalid content from JSON`);
      return null;
    }
    
    console.log(`[COMMUNITY][AIRHOSTS][SUCCESS] JSON extraction complete:`);
    console.log(`[COMMUNITY][AIRHOSTS][SUCCESS] - Title: "${title.substring(0, 50)}..."`);
    console.log(`[COMMUNITY][AIRHOSTS][SUCCESS] - Posts extracted: ${postsExtracted}`);
    console.log(`[COMMUNITY][AIRHOSTS][SUCCESS] - Replies extracted: ${repliesExtracted}`);
    console.log(`[COMMUNITY][AIRHOSTS][SUCCESS] - Total characters: ${totalCharacters}`);
    
    return {
      title,
      content: cleanContent(content),
      author: author || undefined,
      votes: 0,
      url,
      platform: getPlatformFromUrl(url),
      source: getSourceFromUrl(url),
      contentType: 'community',
      category: config.category,
      postsExtracted,
      repliesExtracted,
      totalCharacters,
    };
  } catch (error) {
    console.error(`[COMMUNITY][AIRHOSTS] Error parsing JSON:`, error);
    return null;
  }
}

// Store community content in database
async function storeCommunityContent(content: CommunityContent): Promise<void> {
  try {
    // Detect language of the content
    const languageDetection = detectLanguage(content.content);
    console.log(`[COMMUNITY][LANG] Detected language: ${languageDetection.language} (confidence: ${languageDetection.confidence.toFixed(2)}, reliable: ${languageDetection.isReliable})`);

    // Create paragraphs for embedding (similar to official content)
    const paragraphs = content.content
      .split(/\n+/)
      .filter(p => p.trim().length > 50)
      .slice(0, 5); // Limit to 5 paragraphs

    const slug = slugify(content.title);
    // Ensure slug is unique
    let finalSlug = slug;
    let counter = 1;
    while (await prisma.article.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    await prisma.article.upsert({
      where: { url: content.url },
      create: {
        url: content.url,
        question: content.title,
        slug: finalSlug,
        answer: content.content,
        category: content.category,
        platform: content.platform,
        contentType: content.contentType,
        source: content.source,
        author: content.author,
        votes: content.votes || 0,
        isVerified: (content.votes || 0) > 10, // Auto-verify high-voted content
        language: languageDetection.language,
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
        slug: finalSlug,
        category: content.category,
        platform: content.platform,
        contentType: content.contentType,
        source: content.source,
        author: content.author,
        votes: content.votes || 0,
        isVerified: (content.votes || 0) > 10,
        language: languageDetection.language,
        lastUpdated: new Date(),
      },
    });

    console.log(`[COMMUNITY] Successfully stored: ${content.url} [Language: ${languageDetection.language}]`);
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
 * - AirHosts Forum (airhostsforum.com)
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
  
  // Filter out category listing pages
  const filteredUrls = urls.filter(url => !isCategoryListingPage(url));
  console.log(`[COMMUNITY] After filtering category pages: ${filteredUrls.length} URLs remaining`);
  
  // First verify which URLs are accessible
  const verificationResults = await verifyCommunityUrls(filteredUrls);
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
  
  // Log summary statistics
  const totalPosts = results.reduce((sum, r) => sum + (r.postsExtracted || 0), 0);
  const totalReplies = results.reduce((sum, r) => sum + (r.repliesExtracted || 0), 0);
  const totalChars = results.reduce((sum, r) => sum + (r.totalCharacters || 0), 0);
  
  console.log(`[COMMUNITY] Summary:`);
  console.log(`[COMMUNITY] - Total posts extracted: ${totalPosts}`);
  console.log(`[COMMUNITY] - Total replies extracted: ${totalReplies}`);
  console.log(`[COMMUNITY] - Total characters: ${totalChars}`);
  
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
  // Updated test URLs based on the action plan
  const COMMUNITY_URLS = [
    // Airbnb Community - Thread pages only (matching /t5/*/td-p/* pattern)
    'https://community.withairbnb.com/t5/Hosting/When-does-Airbnb-pay-hosts/td-p/184758',
    
    // AirHosts Forum - Thread pages with .json API support (using a more common URL pattern)
    'https://airhostsforum.com/t/listing-issues/59544',
    
    // Note: Removed category listing pages like:
    // 'https://community.withairbnb.com/t5/Ask-about-your-listing/bd-p/manage-listing'
    // These will be automatically filtered out by isCategoryListingPage()
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