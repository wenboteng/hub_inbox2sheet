"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedRedditCrawler = void 0;
exports.crawlRedditEnhanced = crawlRedditEnhanced;
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const parseHelpers_1 = require("../utils/parseHelpers");
const slugify_1 = require("../utils/slugify");
const prisma = new client_1.PrismaClient();
// Enhanced Reddit API Configuration
const REDDIT_CONFIG = {
    // Priority travel/hosting subreddits (these will be crawled first)
    subreddits: [
        'Tourguide', // PRIORITY
        'airbnb_hosts', // PRIORITY
        'AirBnBHosts', // PRIORITY
        'TravelAgent', // PRIORITY
        // Existing popular travel subreddits
        'travel',
        'solotravel',
        'backpacking',
        'digitalnomad',
        'travelhacks',
        'travelpartners',
        'travelphotos',
        'traveldeals',
        'traveling',
        'wanderlust'
    ],
    // API configuration
    baseUrl: 'https://oauth.reddit.com',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    // Rate limiting (Reddit allows 60 requests per minute for authenticated requests)
    rateLimit: {
        requestsPerMinute: 50, // Conservative limit
        delayBetweenRequests: 1200, // 1.2 seconds between requests
        maxRetries: 3,
    },
    // Content filtering
    minScore: 5, // Minimum upvotes for a post
    minComments: 3, // Minimum comments for a post
    maxPostsPerSubreddit: 100, // Maximum posts to fetch per subreddit
    maxCommentsPerPost: 50, // Maximum comments to fetch per post
    // Time filtering (posts from last 30 days)
    timeFilter: 'month', // 'hour', 'day', 'week', 'month', 'year', 'all'
    // Content types to fetch
    sortBy: 'hot', // 'hot', 'new', 'top', 'rising'
    // Content quality filters
    minContentLength: 100, // Minimum characters for post content
    minCommentLength: 50, // Minimum characters for comment content
    excludeKeywords: ['removed', 'deleted', '[deleted]', '[removed]'],
};
class EnhancedRedditCrawler {
    constructor() {
        this.stats = {
            subredditsProcessed: 0,
            postsDiscovered: 0,
            postsExtracted: 0,
            commentsExtracted: 0,
            errors: [],
            skippedPosts: [],
            rateLimitHits: 0,
            totalRequests: 0,
        };
        this.processedUrls = new Set();
        this.accessToken = null;
        this.lastRequestTime = 0;
        this.initializeRedditClient();
    }
    async initializeRedditClient() {
        console.log('[REDDIT-ENHANCED] Initializing Reddit API client...');
        // For now, we'll use the public JSON API
        // In production, you'd want to implement OAuth2 authentication
        // This requires creating a Reddit app and getting client credentials
        console.log('[REDDIT-ENHANCED] Using public Reddit JSON API (rate limited)');
        console.log('[REDDIT-ENHANCED] For production use, implement OAuth2 authentication');
    }
    async delay() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const minDelay = REDDIT_CONFIG.rateLimit.delayBetweenRequests;
        if (timeSinceLastRequest < minDelay) {
            const waitTime = minDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.lastRequestTime = Date.now();
    }
    async makeRedditRequest(endpoint, retries = 0) {
        try {
            await this.delay();
            const url = `https://www.reddit.com${endpoint}.json`;
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': REDDIT_CONFIG.userAgent,
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                timeout: 30000,
            });
            this.stats.totalRequests++;
            if (response.status === 429) {
                this.stats.rateLimitHits++;
                console.warn(`[REDDIT-ENHANCED] Rate limit hit, waiting 60 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 60000));
                return this.makeRedditRequest(endpoint, retries + 1);
            }
            return response.data;
        }
        catch (error) {
            if (error && typeof error === 'object' && 'response' in error) {
                if (error.response?.status === 429 && retries < REDDIT_CONFIG.rateLimit.maxRetries) {
                    this.stats.rateLimitHits++;
                    console.warn(`[REDDIT-ENHANCED] Rate limit hit (attempt ${retries + 1}), waiting 60 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 60000));
                    return this.makeRedditRequest(endpoint, retries + 1);
                }
                if (error.response?.status === 404) {
                    console.warn(`[REDDIT-ENHANCED] Endpoint not found: ${endpoint}`);
                    return null;
                }
                console.error(`[REDDIT-ENHANCED] HTTP error ${error.response?.status}: ${endpoint}`);
            }
            else {
                console.error(`[REDDIT-ENHANCED] Request error for ${endpoint}:`, error.message);
            }
            throw error;
        }
    }
    isContentQuality(content) {
        if (!content || content.length < REDDIT_CONFIG.minContentLength) {
            return false;
        }
        // Check for excluded keywords
        const lowerContent = content.toLowerCase();
        for (const keyword of REDDIT_CONFIG.excludeKeywords) {
            if (lowerContent.includes(keyword)) {
                return false;
            }
        }
        // Check for too many special characters or formatting
        const specialCharRatio = (content.match(/[^\w\s]/g) || []).length / content.length;
        if (specialCharRatio > 0.3) {
            return false;
        }
        return true;
    }
    async fetchSubredditPosts(subreddit) {
        console.log(`[REDDIT-ENHANCED] Fetching posts from r/${subreddit}...`);
        const endpoint = `/r/${subreddit}/${REDDIT_CONFIG.sortBy}.json?limit=${REDDIT_CONFIG.maxPostsPerSubreddit}&t=${REDDIT_CONFIG.timeFilter}`;
        const data = await this.makeRedditRequest(endpoint);
        if (!data?.data?.children) {
            console.warn(`[REDDIT-ENHANCED] No posts found for r/${subreddit}`);
            return [];
        }
        const posts = data.data.children
            .map((child) => child.data)
            .filter((post) => {
            // Enhanced filtering criteria
            return (post.is_self && // Only text posts
                post.score >= REDDIT_CONFIG.minScore &&
                post.num_comments >= REDDIT_CONFIG.minComments &&
                !post.stickied && // Not stickied posts
                !post.over_18 && // Not NSFW
                !post.hidden && // Not hidden
                !post.archived && // Not archived
                post.selftext &&
                this.isContentQuality(post.selftext) && // Quality check
                post.title && post.title.length > 10 // Minimum title length
            );
        });
        console.log(`[REDDIT-ENHANCED] Found ${posts.length} qualifying posts in r/${subreddit}`);
        return posts;
    }
    async fetchPostComments(postId) {
        try {
            const endpoint = `/comments/${postId}.json?limit=${REDDIT_CONFIG.maxCommentsPerPost}`;
            const data = await this.makeRedditRequest(endpoint);
            if (!data?.[1]?.data?.children) {
                return [];
            }
            const extractComments = (comments, depth = 0) => {
                return comments
                    .map((child) => child.data)
                    .filter((comment) => {
                    return (comment.body &&
                        comment.body.length >= REDDIT_CONFIG.minCommentLength &&
                        comment.score > 0 && // Positive score
                        !comment.deleted &&
                        !comment.removed &&
                        !comment.author?.includes('[deleted]') &&
                        this.isContentQuality(comment.body) &&
                        depth < 3 // Limit comment depth to avoid very nested comments
                    );
                })
                    .map((comment) => ({
                    id: comment.id,
                    body: comment.body,
                    author: comment.author || 'Unknown',
                    score: comment.score,
                    created_utc: comment.created_utc,
                    depth,
                    isDeleted: false,
                    replies: comment.replies?.data?.children ?
                        extractComments(comment.replies.data.children, depth + 1) :
                        undefined
                }));
            };
            const comments = extractComments(data[1].data.children);
            return comments;
        }
        catch (error) {
            console.error(`[REDDIT-ENHANCED] Error fetching comments for post ${postId}:`, error);
            return [];
        }
    }
    extractCategoryFromSubreddit(subreddit) {
        const categoryMap = {
            'travel': 'General Travel',
            'solotravel': 'Solo Travel',
            'backpacking': 'Backpacking',
            'digitalnomad': 'Digital Nomad',
            'travelhacks': 'Travel Tips & Hacks',
            'travelpartners': 'Travel Partners',
            'travelphotos': 'Travel Photography',
            'traveldeals': 'Travel Deals',
            'traveling': 'General Travel',
            'wanderlust': 'Travel Inspiration',
        };
        return categoryMap[subreddit] || 'Travel Discussion';
    }
    async convertPostToArticle(post, subreddit) {
        const category = this.extractCategoryFromSubreddit(subreddit);
        const url = `https://reddit.com${post.permalink}`;
        const question = (0, parseHelpers_1.cleanText)(post.title);
        const answer = (0, parseHelpers_1.cleanText)(post.selftext);
        // Create a comprehensive answer with metadata
        let fullAnswer = answer;
        // Add post metadata
        fullAnswer += `\n\n---\n\n**Post Details:**\n`;
        fullAnswer += `- **Subreddit:** r/${subreddit}\n`;
        fullAnswer += `- **Author:** u/${post.author || 'Unknown'}\n`;
        fullAnswer += `- **Score:** ${post.score} upvotes\n`;
        fullAnswer += `- **Upvote Ratio:** ${(post.upvote_ratio * 100).toFixed(1)}%\n`;
        fullAnswer += `- **Comments:** ${post.num_comments}\n`;
        fullAnswer += `- **Posted:** ${new Date(post.created_utc * 1000).toLocaleDateString()}\n`;
        fullAnswer += `- **URL:** ${url}\n`;
        return {
            platform: 'Reddit',
            url,
            question,
            answer: fullAnswer,
            author: post.author || 'Unknown',
            date: new Date(post.created_utc * 1000).toISOString(),
            category,
            contentType: 'community',
            source: 'reddit',
            isThread: true,
            threadId: post.id,
            subreddit,
            score: post.score,
            commentCount: post.num_comments,
            upvoteRatio: post.upvote_ratio,
            isSelfPost: post.is_self,
        };
    }
    async convertCommentToArticle(comment, post, subreddit) {
        const category = this.extractCategoryFromSubreddit(subreddit);
        const url = `https://reddit.com${post.permalink}`;
        const question = (0, parseHelpers_1.cleanText)(post.title);
        const answer = (0, parseHelpers_1.cleanText)(comment.body);
        // Create context for the comment
        let fullAnswer = `**Comment by u/${comment.author}:**\n\n${answer}\n\n`;
        // Add post context (truncated)
        const postContext = (0, parseHelpers_1.cleanText)(post.selftext);
        if (postContext.length > 500) {
            fullAnswer += `**Original Post Context:**\n${postContext.substring(0, 500)}...\n\n`;
        }
        else {
            fullAnswer += `**Original Post Context:**\n${postContext}\n\n`;
        }
        fullAnswer += `---\n\n**Details:**\n`;
        fullAnswer += `- **Subreddit:** r/${subreddit}\n`;
        fullAnswer += `- **Comment Score:** ${comment.score} upvotes\n`;
        fullAnswer += `- **Comment Depth:** ${comment.depth}\n`;
        fullAnswer += `- **Posted:** ${new Date(comment.created_utc * 1000).toLocaleDateString()}\n`;
        fullAnswer += `- **Original Post:** ${url}\n`;
        return {
            platform: 'Reddit',
            url: `${url}#comment-${comment.id}`,
            question,
            answer: fullAnswer,
            author: comment.author,
            date: new Date(comment.created_utc * 1000).toISOString(),
            category,
            contentType: 'community',
            source: 'reddit',
            isThread: false,
            threadId: post.id,
            replyTo: post.id,
            subreddit,
            score: comment.score,
            commentCount: 1,
            isSelfPost: false,
        };
    }
    async saveToDatabase(posts) {
        if (posts.length === 0)
            return;
        console.log(`[REDDIT-ENHANCED] Saving ${posts.length} articles to database...`);
        for (const post of posts) {
            try {
                // Check if article already exists
                const existing = await prisma.article.findUnique({
                    where: { url: post.url }
                });
                if (existing) {
                    console.log(`[REDDIT-ENHANCED] Article already exists: ${post.question.substring(0, 50)}...`);
                    continue;
                }
                // Use English as default language for Reddit content
                const language = 'en';
                // Create slug
                const slug = (0, slugify_1.slugify)(post.question);
                // Save to database
                await prisma.article.create({
                    data: {
                        url: post.url,
                        question: post.question,
                        answer: post.answer,
                        slug,
                        category: post.category,
                        platform: post.platform,
                        contentType: post.contentType,
                        source: post.source,
                        author: post.author,
                        language,
                        // Store additional metadata
                        lastCheckedAt: new Date(),
                        crawlMode: 'discovery',
                        crawlStatus: 'active',
                    }
                });
                console.log(`[REDDIT-ENHANCED] Saved: ${post.question.substring(0, 50)}...`);
            }
            catch (error) {
                console.error(`[REDDIT-ENHANCED] Error saving article:`, error);
                this.stats.errors.push(`Failed to save article: ${post.url}`);
            }
        }
    }
    async crawlSubreddit(subreddit) {
        console.log(`[REDDIT-ENHANCED] 🚀 Starting crawl of r/${subreddit}`);
        try {
            // Fetch posts from subreddit
            const posts = await this.fetchSubredditPosts(subreddit);
            this.stats.postsDiscovered += posts.length;
            const articles = [];
            for (const post of posts) {
                try {
                    // Convert post to article
                    const postArticle = await this.convertPostToArticle(post, subreddit);
                    articles.push(postArticle);
                    this.stats.postsExtracted++;
                    // Fetch and convert top comments
                    const comments = await this.fetchPostComments(post.id);
                    for (const comment of comments) {
                        const commentArticle = await this.convertCommentToArticle(comment, post, subreddit);
                        articles.push(commentArticle);
                        this.stats.commentsExtracted++;
                    }
                    console.log(`[REDDIT-ENHANCED] Processed post: ${post.title.substring(0, 50)}... (${comments.length} comments)`);
                }
                catch (error) {
                    console.error(`[REDDIT-ENHANCED] Error processing post ${post.id}:`, error);
                    this.stats.errors.push(`Failed to process post: ${post.id}`);
                    this.stats.skippedPosts.push(post.id);
                }
            }
            // Save all articles for this subreddit
            await this.saveToDatabase(articles);
            this.stats.subredditsProcessed++;
            console.log(`[REDDIT-ENHANCED] ✅ Completed r/${subreddit}: ${articles.length} articles saved`);
        }
        catch (error) {
            console.error(`[REDDIT-ENHANCED] ❌ Error crawling r/${subreddit}:`, error);
            this.stats.errors.push(`Failed to crawl subreddit: ${subreddit}`);
        }
    }
    async crawl() {
        console.log('🚀 ENHANCED REDDIT CRAWLER STARTING');
        console.log('====================================');
        console.log(`Target subreddits: ${REDDIT_CONFIG.subreddits.join(', ')}`);
        console.log(`Rate limit: ${REDDIT_CONFIG.rateLimit.requestsPerMinute} requests/minute`);
        console.log(`Time filter: ${REDDIT_CONFIG.timeFilter}`);
        console.log(`Sort by: ${REDDIT_CONFIG.sortBy}`);
        console.log(`Quality filters: min ${REDDIT_CONFIG.minContentLength} chars, min score ${REDDIT_CONFIG.minScore}`);
        console.log('');
        const startTime = Date.now();
        for (const subreddit of REDDIT_CONFIG.subreddits) {
            await this.crawlSubreddit(subreddit);
            // Add extra delay between subreddits
            console.log(`[REDDIT-ENHANCED] Waiting 10 seconds before next subreddit...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        const duration = Date.now() - startTime;
        console.log('\n📈 ENHANCED REDDIT CRAWL RESULTS');
        console.log('=================================');
        console.log(`Duration: ${(duration / 1000 / 60).toFixed(1)} minutes`);
        console.log(`Subreddits processed: ${this.stats.subredditsProcessed}`);
        console.log(`Posts discovered: ${this.stats.postsDiscovered}`);
        console.log(`Posts extracted: ${this.stats.postsExtracted}`);
        console.log(`Comments extracted: ${this.stats.commentsExtracted}`);
        console.log(`Total content: ${this.stats.postsExtracted + this.stats.commentsExtracted}`);
        console.log(`Total requests: ${this.stats.totalRequests}`);
        console.log(`Rate limit hits: ${this.stats.rateLimitHits}`);
        console.log(`Errors: ${this.stats.errors.length}`);
        console.log(`Skipped posts: ${this.stats.skippedPosts.length}`);
        if (this.stats.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.stats.errors.slice(0, 10).forEach(error => console.log(`- ${error}`));
        }
        return this.stats;
    }
    // Public method to get stats
    getStats() {
        return { ...this.stats };
    }
}
exports.EnhancedRedditCrawler = EnhancedRedditCrawler;
async function crawlRedditEnhanced() {
    const crawler = new EnhancedRedditCrawler();
    try {
        const stats = await crawler.crawl();
        return stats;
    }
    catch (error) {
        console.error('❌ Enhanced Reddit crawler failed:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
//# sourceMappingURL=reddit-enhanced.js.map