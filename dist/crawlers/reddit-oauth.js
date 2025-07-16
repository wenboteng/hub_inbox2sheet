"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlRedditOAuth = crawlRedditOAuth;
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const parseHelpers_1 = require("../utils/parseHelpers");
const slugify_1 = require("../utils/slugify");
const prisma = new client_1.PrismaClient();
// OAuth2 Reddit Configuration
const REDDIT_CONFIG = {
    // OAuth2 Configuration
    oauth: {
        clientId: process.env.REDDIT_CLIENT_ID || '',
        clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
        userAgent: 'OTAAnswersCrawler/1.0 (by /u/your_username)',
        redirectUri: 'http://localhost:3000/auth/reddit/callback',
    },
    // Target subreddits (priority order)
    subreddits: [
        'Tourguide', // PRIORITY
        'airbnb_hosts', // PRIORITY
        'AirBnBHosts', // PRIORITY
        'TravelAgent', // PRIORITY
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
class OAuthRedditCrawler {
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
        console.log('[REDDIT-OAUTH] Initializing Reddit OAuth2 client...');
        if (!REDDIT_CONFIG.oauth.clientId || !REDDIT_CONFIG.oauth.clientSecret) {
            throw new Error('[REDDIT-OAUTH] Missing Reddit OAuth2 credentials. Please set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables.');
        }
        await this.authenticate();
    }
    async authenticate() {
        try {
            console.log('[REDDIT-OAUTH] Authenticating with Reddit API...');
            // For script apps, we use the "client credentials" flow
            const authResponse = await axios_1.default.post('https://www.reddit.com/api/v1/access_token', 'grant_type=client_credentials', {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${REDDIT_CONFIG.oauth.clientId}:${REDDIT_CONFIG.oauth.clientSecret}`).toString('base64')}`,
                    'User-Agent': REDDIT_CONFIG.oauth.userAgent,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout: 30000,
            });
            this.accessToken = authResponse.data.access_token;
            console.log('[REDDIT-OAUTH] Successfully authenticated with Reddit API');
        }
        catch (error) {
            console.error('[REDDIT-OAUTH] Authentication failed:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Reddit API. Please check your credentials.');
        }
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
        if (!this.accessToken) {
            await this.authenticate();
        }
        try {
            await this.delay();
            const url = `${REDDIT_CONFIG.baseUrl}${endpoint}`;
            const response = await axios_1.default.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'User-Agent': REDDIT_CONFIG.oauth.userAgent,
                    'Accept': 'application/json',
                },
                timeout: 30000,
            });
            this.stats.totalRequests++;
            return response.data;
        }
        catch (error) {
            if (error && typeof error === 'object' && 'response' in error) {
                if (error.response?.status === 401 && retries < REDDIT_CONFIG.rateLimit.maxRetries) {
                    // Token expired, re-authenticate
                    console.warn('[REDDIT-OAUTH] Token expired, re-authenticating...');
                    await this.authenticate();
                    return this.makeRedditRequest(endpoint, retries + 1);
                }
                if (error.response?.status === 429 && retries < REDDIT_CONFIG.rateLimit.maxRetries) {
                    this.stats.rateLimitHits++;
                    console.warn(`[REDDIT-OAUTH] Rate limit hit (attempt ${retries + 1}), waiting 60 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 60000));
                    return this.makeRedditRequest(endpoint, retries + 1);
                }
                if (error.response?.status === 404) {
                    console.warn(`[REDDIT-OAUTH] Endpoint not found: ${endpoint}`);
                    return null;
                }
                console.error(`[REDDIT-OAUTH] HTTP error ${error.response?.status}: ${endpoint}`);
            }
            else {
                console.error(`[REDDIT-OAUTH] Request error for ${endpoint}:`, error.message);
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
        try {
            const endpoint = `/r/${subreddit}/${REDDIT_CONFIG.sortBy}.json?t=${REDDIT_CONFIG.timeFilter}&limit=${REDDIT_CONFIG.maxPostsPerSubreddit}`;
            const data = await this.makeRedditRequest(endpoint);
            if (!data || !data.data || !data.data.children) {
                console.warn(`[REDDIT-OAUTH] No posts found for r/${subreddit}`);
                return [];
            }
            const posts = data.data.children
                .map((child) => child.data)
                .filter((post) => {
                // Filter by score and comment count
                if (post.score < REDDIT_CONFIG.minScore)
                    return false;
                if (post.num_comments < REDDIT_CONFIG.minComments)
                    return false;
                // Only include self posts (text posts)
                if (post.is_self !== true)
                    return false;
                // Check content quality
                if (!this.isContentQuality(post.selftext || ''))
                    return false;
                return true;
            });
            console.log(`[REDDIT-OAUTH] Found ${posts.length} quality posts in r/${subreddit}`);
            return posts;
        }
        catch (error) {
            console.error(`[REDDIT-OAUTH] Error fetching posts from r/${subreddit}:`, error.message);
            throw error;
        }
    }
    async fetchPostComments(postId) {
        try {
            const endpoint = `/comments/${postId}.json?limit=${REDDIT_CONFIG.maxCommentsPerPost}`;
            const data = await this.makeRedditRequest(endpoint);
            // Validate the response structure
            if (!data || !Array.isArray(data) || data.length < 2) {
                console.log(`[REDDIT-OAUTH] No comments data for post ${postId}`);
                return [];
            }
            if (!data[1] || !data[1].data || !data[1].data.children) {
                console.log(`[REDDIT-OAUTH] Invalid comments structure for post ${postId}`);
                return [];
            }
            const extractComments = (comments, depth = 0) => {
                if (depth > 3)
                    return []; // Limit comment depth
                if (!comments || !Array.isArray(comments)) {
                    return [];
                }
                return comments
                    .map((child) => child?.data)
                    .filter((comment) => {
                    if (!comment || !comment.body || comment.body === '[deleted]' || comment.body === '[removed]')
                        return false;
                    if (comment.score < 1)
                        return false; // Only positive comments
                    if (comment.body.length < REDDIT_CONFIG.minCommentLength)
                        return false;
                    return true;
                })
                    .map((comment) => ({
                    id: comment.id,
                    body: (0, parseHelpers_1.cleanText)(comment.body),
                    author: comment.author,
                    score: comment.score,
                    created_utc: comment.created_utc,
                    depth: depth,
                    isDeleted: false,
                    replies: comment.replies && comment.replies.data && comment.replies.data.children
                        ? extractComments(comment.replies.data.children, depth + 1)
                        : [],
                }));
            };
            const comments = extractComments(data[1].data.children);
            console.log(`[REDDIT-OAUTH] Found ${comments.length} quality comments for post ${postId}`);
            return comments;
        }
        catch (error) {
            console.error(`[REDDIT-OAUTH] Error fetching comments for post ${postId}:`, error.message);
            return [];
        }
    }
    extractCategoryFromSubreddit(subreddit) {
        const categoryMap = {
            'Tourguide': 'Tour Guide',
            'airbnb_hosts': 'Airbnb Hosting',
            'AirBnBHosts': 'Airbnb Hosting',
            'TravelAgent': 'Travel Agent',
            'travel': 'General Travel',
            'solotravel': 'Solo Travel',
            'backpacking': 'Backpacking',
            'digitalnomad': 'Digital Nomad',
            'travelhacks': 'Travel Tips',
            'travelpartners': 'Travel Partners',
            'travelphotos': 'Travel Photography',
            'traveldeals': 'Travel Deals',
            'traveling': 'General Travel',
            'wanderlust': 'Travel Inspiration',
        };
        return categoryMap[subreddit] || 'Travel Discussion';
    }
    async convertPostToArticle(post, subreddit) {
        const url = `https://www.reddit.com${post.permalink}`;
        const category = this.extractCategoryFromSubreddit(subreddit);
        return {
            platform: 'Reddit',
            url,
            question: (0, parseHelpers_1.cleanText)(post.title),
            answer: (0, parseHelpers_1.cleanText)(post.selftext || ''),
            author: post.author,
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
        const url = `https://www.reddit.com${post.permalink}`;
        const category = this.extractCategoryFromSubreddit(subreddit);
        return {
            platform: 'Reddit',
            url: `${url}#${comment.id}`,
            question: `Comment on: ${(0, parseHelpers_1.cleanText)(post.title)}`,
            answer: comment.body,
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
            commentCount: 0,
            isSelfPost: false,
        };
    }
    async saveToDatabase(posts) {
        console.log(`[REDDIT-OAUTH] Saving ${posts.length} Reddit posts to database...`);
        for (const post of posts) {
            try {
                // Check if URL already exists
                const existing = await prisma.article.findUnique({
                    where: { url: post.url }
                });
                if (existing) {
                    console.log(`[REDDIT-OAUTH] Skipping duplicate: ${post.url}`);
                    continue;
                }
                // Generate unique slug
                const baseSlug = (0, slugify_1.slugify)(post.question);
                let slug = baseSlug;
                let counter = 1;
                while (await prisma.article.findUnique({ where: { slug } })) {
                    slug = `${baseSlug}-${counter}`;
                    counter++;
                }
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
                        crawlStatus: 'active',
                    }
                });
                console.log(`[REDDIT-OAUTH] Saved: ${post.question.substring(0, 50)}...`);
            }
            catch (error) {
                console.error(`[REDDIT-OAUTH] Error saving post ${post.url}:`, error.message);
            }
        }
    }
    async crawlSubreddit(subreddit) {
        try {
            console.log(`[REDDIT-OAUTH] Crawling subreddit: r/${subreddit}`);
            const posts = await this.fetchSubredditPosts(subreddit);
            this.stats.postsDiscovered += posts.length;
            const articles = [];
            for (const post of posts) {
                try {
                    // Convert post to article
                    const postArticle = await this.convertPostToArticle(post, subreddit);
                    articles.push(postArticle);
                    this.stats.postsExtracted++;
                    // Fetch and convert comments
                    const comments = await this.fetchPostComments(post.id);
                    this.stats.commentsExtracted += comments.length;
                    for (const comment of comments) {
                        const commentArticle = await this.convertCommentToArticle(comment, post, subreddit);
                        articles.push(commentArticle);
                    }
                }
                catch (error) {
                    console.error(`[REDDIT-OAUTH] Error processing post ${post.id}:`, error.message);
                    this.stats.skippedPosts.push(`Post ${post.id}: ${error.message}`);
                }
            }
            // Save all articles to database
            await this.saveToDatabase(articles);
            this.stats.subredditsProcessed++;
            console.log(`[REDDIT-OAUTH] Completed r/${subreddit}: ${articles.length} articles saved`);
        }
        catch (error) {
            console.error(`[REDDIT-OAUTH] Failed to crawl subreddit: ${subreddit}`, error.message);
            this.stats.errors.push(`Failed to crawl subreddit: ${subreddit}`);
        }
    }
    async crawl() {
        console.log('[REDDIT-OAUTH] Starting OAuth2 Reddit crawl...');
        console.log(`[REDDIT-OAUTH] Target subreddits: ${REDDIT_CONFIG.subreddits.join(', ')}`);
        const startTime = Date.now();
        for (const subreddit of REDDIT_CONFIG.subreddits) {
            try {
                await this.crawlSubreddit(subreddit);
                // Add delay between subreddits to be respectful
                if (subreddit !== REDDIT_CONFIG.subreddits[REDDIT_CONFIG.subreddits.length - 1]) {
                    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
                }
            }
            catch (error) {
                console.error(`[REDDIT-OAUTH] Error crawling ${subreddit}:`, error.message);
                this.stats.errors.push(`Error crawling ${subreddit}: ${error.message}`);
            }
        }
        const duration = (Date.now() - startTime) / 1000 / 60; // minutes
        console.log('\n📈 ENHANCED REDDIT CRAWL RESULTS');
        console.log('=================================');
        console.log(`Duration: ${duration.toFixed(1)} minutes`);
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
            console.log('❌ ERRORS:');
            this.stats.errors.slice(0, 10).forEach(error => console.log(`- ${error}`));
        }
        return this.stats;
    }
    getStats() {
        return { ...this.stats };
    }
}
async function crawlRedditOAuth() {
    const crawler = new OAuthRedditCrawler();
    return await crawler.crawl();
}
// Run the crawler if this file is executed directly
if (require.main === module) {
    crawlRedditOAuth()
        .then((stats) => {
        console.log('[REDDIT-OAUTH] Crawl completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('[REDDIT-OAUTH] Crawl failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=reddit-oauth.js.map