"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlNewsAndPolicies = crawlNewsAndPolicies;
exports.getHighPriorityArticles = getHighPriorityArticles;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const client_1 = require("@prisma/client");
const languageDetection_1 = require("../utils/languageDetection");
const slugify_1 = require("../utils/slugify");
const openai_1 = require("../utils/openai");
const prisma = new client_1.PrismaClient();
// News and policy sources for outreach
const NEWS_SOURCES = {
    airbnb: {
        name: 'Airbnb',
        baseUrl: 'https://www.airbnb.com',
        blogUrl: 'https://www.airbnb.com/press/news',
        policyUrl: 'https://www.airbnb.com/help/article/2855',
        helpUrl: 'https://www.airbnb.com/help',
        selectors: {
            title: 'h1, .post-title, .entry-title, .headline, .help-article-title',
            content: '.post-content, .entry-content, .article-content, .content, .help-article-content',
            date: 'time[datetime], .post-date, .entry-date, .publish-date',
            author: '.author, .byline, .post-author',
            summary: '.excerpt, .summary, .description',
        },
        categories: ['policy', 'announcements', 'updates', 'new-features'],
    },
    booking: {
        name: 'Booking.com',
        baseUrl: 'https://www.booking.com',
        blogUrl: 'https://www.booking.com/content/policies.html',
        policyUrl: 'https://www.booking.com/content/policies.html',
        helpUrl: 'https://www.booking.com/content/help.html',
        selectors: {
            title: 'h1, .article-title, .post-title, .headline',
            content: '.article-content, .post-content, .content',
            date: 'time[datetime], .publish-date, .article-date',
            author: '.author, .byline, .writer',
            summary: '.excerpt, .summary, .description',
        },
        categories: ['policy', 'announcements', 'updates', 'new-features'],
    },
    expedia: {
        name: 'Expedia',
        baseUrl: 'https://www.expedia.com',
        blogUrl: 'https://www.expedia.com/help',
        policyUrl: 'https://www.expedia.com/help',
        helpUrl: 'https://www.expedia.com/help',
        selectors: {
            title: 'h1, .article-title, .post-title, .headline',
            content: '.article-content, .post-content, .content',
            date: 'time[datetime], .publish-date, .article-date',
            author: '.author, .byline, .writer',
            summary: '.excerpt, .summary, .description',
        },
        categories: ['policy', 'announcements', 'updates', 'new-features'],
    },
    getyourguide: {
        name: 'GetYourGuide',
        baseUrl: 'https://www.getyourguide.com',
        blogUrl: 'https://www.getyourguide.com/help',
        policyUrl: 'https://www.getyourguide.com/help',
        helpUrl: 'https://www.getyourguide.com/help',
        selectors: {
            title: 'h1, .article-title, .post-title, .headline',
            content: '.article-content, .post-content, .content',
            date: 'time[datetime], .publish-date, .article-date',
            author: '.author, .byline, .writer',
            summary: '.excerpt, .summary, .description',
        },
        categories: ['policy', 'announcements', 'updates', 'new-features'],
    },
    viator: {
        name: 'Viator',
        baseUrl: 'https://www.viator.com',
        blogUrl: 'https://www.viator.com/help',
        policyUrl: 'https://www.viator.com/help',
        helpUrl: 'https://www.viator.com/help',
        selectors: {
            title: 'h1, .article-title, .post-title, .headline',
            content: '.article-content, .post-content, .content',
            date: 'time[datetime], .publish-date, .article-date',
            author: '.author, .byline, .writer',
            summary: '.excerpt, .summary, .description',
        },
        categories: ['policy', 'announcements', 'updates', 'new-features'],
    },
};
// Alternative content sources that are more accessible
const ALTERNATIVE_SOURCES = {
    reddit: {
        name: 'Reddit',
        urls: [
            'https://www.reddit.com/r/AirBnB/hot.json',
            'https://www.reddit.com/r/airbnb_hosts/hot.json',
            'https://www.reddit.com/r/airbnb/hot.json',
            'https://www.reddit.com/r/travel/hot.json',
        ],
        selectors: {
            title: '.title',
            content: '.selftext',
            date: '.created_utc',
            author: '.author',
            score: '.score',
        },
    },
    quora: {
        name: 'Quora',
        urls: [
            'https://www.quora.com/topic/Airbnb',
            'https://www.quora.com/topic/Booking-com',
            'https://www.quora.com/topic/Online-Travel-Agencies',
        ],
        selectors: {
            title: '.question_text',
            content: '.answer_text',
            date: '.answer_date',
            author: '.answer_author',
        },
    },
    industry_blogs: {
        name: 'Industry Blogs',
        urls: [
            'https://skift.com/tag/airbnb/',
            'https://skift.com/tag/booking-com/',
            'https://www.phocuswire.com/airbnb',
            'https://www.phocuswire.com/booking-com',
            'https://www.travelweekly.com/Travel-News/Hotel-News/Airbnb',
            'https://www.travelweekly.com/Travel-News/Hotel-News/Booking-com',
        ],
        selectors: {
            title: 'h1, h2, .title, .headline',
            content: '.content, .article-content, .post-content',
            date: 'time, .date, .published',
            author: '.author, .byline',
        },
    },
};
// Policy-related keywords for filtering
const POLICY_KEYWORDS = [
    'policy', 'policy change', 'new policy', 'updated policy',
    'terms', 'terms of service', 'terms and conditions',
    'announcement', 'announce', 'new feature', 'update',
    'cancellation', 'refund', 'booking', 'pricing',
    'fee', 'commission', 'host', 'guest', 'safety',
    'verification', 'identity', 'payment', 'payout',
    'superhost', 'instant book', 'cleaning fee',
    'service fee', 'occupancy tax', 'regulation',
    'compliance', 'legal', 'law', 'government',
    'covid', 'coronavirus', 'pandemic', 'health',
    'security', 'privacy', 'data', 'gdpr',
];
// High-priority keywords for immediate outreach
const HIGH_PRIORITY_KEYWORDS = [
    'policy change', 'new policy', 'announcement',
    'cancellation policy', 'refund policy', 'booking policy',
    'fee change', 'commission change', 'pricing change',
    'safety update', 'verification update', 'payment update',
    'legal requirement', 'compliance update', 'regulation',
];
async function crawlNewsSource(source, url) {
    try {
        console.log(`[NEWS] Crawling ${source.name} news: ${url}`);
        // Try multiple request strategies
        const strategies = [
            // Strategy 1: Standard request with headers
            async () => {
                return await axios_1.default.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Cache-Control': 'max-age=0',
                    },
                    timeout: 15000,
                });
            },
            // Strategy 2: Mobile user agent
            async () => {
                return await axios_1.default.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                    },
                    timeout: 15000,
                });
            },
            // Strategy 3: Minimal headers
            async () => {
                return await axios_1.default.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    },
                    timeout: 15000,
                });
            }
        ];
        let response = null;
        let lastError = null;
        // Try each strategy
        for (let i = 0; i < strategies.length; i++) {
            try {
                console.log(`[NEWS] Trying strategy ${i + 1} for ${source.name}...`);
                response = await strategies[i]();
                // Check if we got a valid response
                if (response && response.status === 200 && response.data) {
                    console.log(`[NEWS] Strategy ${i + 1} succeeded for ${source.name}`);
                    break;
                }
            }
            catch (error) {
                lastError = error;
                console.log(`[NEWS] Strategy ${i + 1} failed for ${source.name}: ${error.message}`);
                // If it's a Cloudflare protection, try next strategy
                if (error.response?.status === 403 ||
                    error.response?.data?.includes('Please enable JS') ||
                    error.response?.data?.includes('captcha')) {
                    continue;
                }
                // For other errors, break and try alternative approach
                break;
            }
        }
        // If all strategies failed, try alternative content sources
        if (!response || response.status !== 200) {
            console.log(`[NEWS] All strategies failed for ${source.name}, trying alternative sources...`);
            return await tryAlternativeSources(source);
        }
        const $ = cheerio.load(response.data);
        // Extract title
        const title = $(source.selectors.title).first().text().trim();
        if (!title) {
            console.log(`[NEWS] No title found for ${url}`);
            return null;
        }
        // Extract content
        const content = $(source.selectors.content).first().text().trim();
        if (!content || content.length < 100) {
            console.log(`[NEWS] Insufficient content for ${url}`);
            return null;
        }
        // Extract date
        const date = $(source.selectors.date).first().attr('datetime') ||
            $(source.selectors.date).first().text().trim();
        // Extract author
        const author = $(source.selectors.author).first().text().trim();
        // Extract summary
        const summary = $(source.selectors.summary).first().text().trim();
        // Determine content type and priority
        const contentType = determineContentType(title, content);
        const priority = determinePriority(title, content);
        // Check if it's policy-related
        const isPolicyRelated = POLICY_KEYWORDS.some(keyword => title.toLowerCase().includes(keyword) || content.toLowerCase().includes(keyword));
        if (!isPolicyRelated) {
            console.log(`[NEWS] Not policy-related, skipping: ${title}`);
            return null;
        }
        // Detect language
        const languageDetection = await (0, languageDetection_1.detectLanguage)(content);
        if (languageDetection.language !== 'en') {
            console.log(`[NEWS] Non-English content, skipping: ${languageDetection.language}`);
            return null;
        }
        return {
            url,
            title,
            content,
            platform: source.name,
            category: contentType,
            publishDate: date,
            author,
            summary,
            contentType,
            priority,
        };
    }
    catch (error) {
        console.error(`[NEWS] Error crawling ${url}:`, error);
        return null;
    }
}
// Alternative content sources when direct crawling fails
async function tryAlternativeSources(source) {
    console.log(`[NEWS] Trying alternative sources for ${source.name}...`);
    // For now, return null - we'll implement this later
    // This could include RSS feeds, API endpoints, or cached content
    return null;
}
function determineContentType(title, content) {
    const text = `${title} ${content}`.toLowerCase();
    if (text.includes('policy') || text.includes('terms') || text.includes('legal')) {
        return 'policy';
    }
    if (text.includes('announce') || text.includes('new feature') || text.includes('update')) {
        return 'announcement';
    }
    return 'news';
}
function determinePriority(title, content) {
    const text = `${title} ${content}`.toLowerCase();
    if (HIGH_PRIORITY_KEYWORDS.some(keyword => text.includes(keyword))) {
        return 'high';
    }
    if (POLICY_KEYWORDS.some(keyword => text.includes(keyword))) {
        return 'medium';
    }
    return 'low';
}
async function saveNewsArticle(article) {
    try {
        // Check if article already exists
        const existing = await prisma.article.findUnique({
            where: { url: article.url }
        });
        if (existing) {
            console.log(`[NEWS] Article already exists: ${article.url}`);
            return;
        }
        // Generate unique slug
        const baseSlug = (0, slugify_1.slugify)(article.title);
        let uniqueSlug = baseSlug;
        let counter = 1;
        while (await prisma.article.findUnique({ where: { slug: uniqueSlug } })) {
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
        }
        // Generate embeddings for content
        const paragraphs = article.content.split('\n\n').filter(p => p.trim().length > 50);
        const paragraphsWithEmbeddings = [];
        for (const paragraph of paragraphs.slice(0, 5)) {
            try {
                const embedding = await (0, openai_1.getEmbedding)(paragraph);
                paragraphsWithEmbeddings.push({ text: paragraph, embedding });
            }
            catch (error) {
                console.error(`[NEWS] Error generating embedding:`, error);
            }
        }
        // Save to database - store priority in category field
        await prisma.article.create({
            data: {
                url: article.url,
                question: article.title,
                answer: article.content,
                slug: uniqueSlug,
                category: `${article.platform} ${article.category} [${article.priority.toUpperCase()}]`,
                platform: article.platform,
                contentType: 'news',
                source: 'news',
                author: article.author,
                language: 'en',
                crawlStatus: 'active',
            }
        });
        console.log(`[NEWS] Saved: ${article.title} (${article.priority} priority)`);
    }
    catch (error) {
        console.error(`[NEWS] Error saving article:`, error);
    }
}
async function crawlNewsAndPolicies() {
    console.log('[NEWS] Starting news and policy crawling...');
    const articles = [];
    // Try to crawl actual news sources with better error handling
    console.log('[NEWS] Attempting to crawl news sources...');
    // Try Airbnb news/press
    try {
        console.log('[NEWS] Trying Airbnb press/news...');
        const airbnbNews = await crawlNewsSource(NEWS_SOURCES.airbnb, NEWS_SOURCES.airbnb.blogUrl);
        if (airbnbNews) {
            articles.push(airbnbNews);
            console.log(`[NEWS] Found Airbnb news: ${airbnbNews.title}`);
        }
    }
    catch (error) {
        console.log('[NEWS] Airbnb news crawling failed:', error.message);
    }
    // Try Booking.com policies
    try {
        console.log('[NEWS] Trying Booking.com policies...');
        const bookingNews = await crawlNewsSource(NEWS_SOURCES.booking, NEWS_SOURCES.booking.policyUrl);
        if (bookingNews) {
            articles.push(bookingNews);
            console.log(`[NEWS] Found Booking.com news: ${bookingNews.title}`);
        }
    }
    catch (error) {
        console.log('[NEWS] Booking.com news crawling failed:', error.message);
    }
    // Try alternative sources that are more accessible
    console.log('[NEWS] Trying alternative accessible sources...');
    // Try Reddit for community discussions about policy changes
    try {
        console.log('[NEWS] Trying Reddit for policy discussions...');
        const redditArticles = await crawlRedditPolicyDiscussions();
        articles.push(...redditArticles);
        console.log(`[NEWS] Found ${redditArticles.length} Reddit policy discussions`);
    }
    catch (error) {
        console.log('[NEWS] Reddit crawling failed:', error.message);
    }
    // Try industry blogs
    try {
        console.log('[NEWS] Trying industry blogs...');
        const blogArticles = await crawlIndustryBlogs();
        articles.push(...blogArticles);
        console.log(`[NEWS] Found ${blogArticles.length} industry blog articles`);
    }
    catch (error) {
        console.log('[NEWS] Industry blog crawling failed:', error.message);
    }
    // If we still don't have enough content, process existing help center articles as policy updates
    if (articles.length < 5) {
        console.log('[NEWS] Processing existing help center articles as policy updates...');
        try {
            const existingArticles = await prisma.article.findMany({
                where: {
                    contentType: 'official',
                    OR: [
                        { category: { contains: 'policy' } },
                        { category: { contains: 'terms' } },
                        { category: { contains: 'cancellation' } },
                        { category: { contains: 'refund' } },
                        { category: { contains: 'booking' } },
                        { category: { contains: 'pricing' } },
                    ]
                },
                take: 10
            });
            console.log(`[NEWS] Found ${existingArticles.length} existing policy-related articles`);
            for (const article of existingArticles) {
                // Check if it's already been processed as news
                const existingNews = await prisma.article.findFirst({
                    where: {
                        url: article.url,
                        contentType: 'news'
                    }
                });
                if (!existingNews) {
                    // Create a news version of this policy article
                    const newsArticle = {
                        url: article.url,
                        title: article.question,
                        content: article.answer,
                        platform: article.platform,
                        category: 'policy',
                        contentType: 'policy',
                        priority: determinePriority(article.question, article.answer),
                    };
                    articles.push(newsArticle);
                    console.log(`[NEWS] Added existing policy article: ${article.question}`);
                }
            }
        }
        catch (error) {
            console.error('[NEWS] Error processing existing articles:', error);
        }
    }
    console.log(`[NEWS] Found ${articles.length} news/policy articles`);
    // Save articles to database
    for (const article of articles) {
        await saveNewsArticle(article);
    }
    console.log('[NEWS] News and policy crawling completed');
    return articles;
}
// Helper function to crawl Reddit for policy discussions
async function crawlRedditPolicyDiscussions() {
    const articles = [];
    try {
        // Try to get Reddit posts about policy changes
        const redditUrls = [
            'https://www.reddit.com/r/AirBnB/search.json?q=policy+change&restrict_sr=on&sort=hot&t=month',
            'https://www.reddit.com/r/airbnb_hosts/search.json?q=policy+update&restrict_sr=on&sort=hot&t=month',
        ];
        for (const url of redditUrls) {
            try {
                const response = await axios_1.default.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    },
                    timeout: 10000,
                });
                if (response.data?.data?.children) {
                    const posts = response.data.data.children.slice(0, 3);
                    for (const post of posts) {
                        const postData = post.data;
                        if (postData.title && postData.selftext && postData.selftext.length > 100) {
                            const article = {
                                url: `https://www.reddit.com${postData.permalink}`,
                                title: postData.title,
                                content: postData.selftext,
                                platform: 'Reddit',
                                category: 'community_policy_discussion',
                                contentType: 'policy',
                                priority: determinePriority(postData.title, postData.selftext),
                                author: postData.author,
                                publishDate: new Date(postData.created_utc * 1000).toISOString(),
                            };
                            articles.push(article);
                        }
                    }
                }
                // Add delay between requests
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            catch (error) {
                console.log(`[NEWS] Reddit URL ${url} failed:`, error.message);
            }
        }
    }
    catch (error) {
        console.log('[NEWS] Reddit crawling failed:', error.message);
    }
    return articles;
}
// Helper function to crawl industry blogs
async function crawlIndustryBlogs() {
    const articles = [];
    try {
        // Try accessible industry news sources
        const blogUrls = [
            'https://skift.com/tag/airbnb/',
            'https://www.phocuswire.com/airbnb',
        ];
        for (const url of blogUrls) {
            try {
                const response = await axios_1.default.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    },
                    timeout: 15000,
                });
                if (response.data) {
                    const $ = cheerio.load(response.data);
                    // Look for recent articles
                    const articleElements = [];
                    $('article, .post, .entry').each((index, element) => {
                        if (index < 3) {
                            const title = $(element).find('h1, h2, h3, .title, .headline').first().text().trim();
                            const content = $(element).find('.excerpt, .summary, .content').first().text().trim();
                            const link = $(element).find('a').first().attr('href');
                            if (title && content && content.length > 100) {
                                const fullUrl = link?.startsWith('http') ? link : new URL(link || '', url).toString();
                                const article = {
                                    url: fullUrl,
                                    title,
                                    content,
                                    platform: 'Industry Blog',
                                    category: 'industry_news',
                                    contentType: 'news',
                                    priority: determinePriority(title, content),
                                };
                                articles.push(article);
                            }
                        }
                    });
                }
                // Add delay between requests
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            catch (error) {
                console.log(`[NEWS] Blog URL ${url} failed:`, error.message);
            }
        }
    }
    catch (error) {
        console.log('[NEWS] Industry blog crawling failed:', error.message);
    }
    return articles;
}
// Function to get high-priority articles for outreach
async function getHighPriorityArticles() {
    const articles = await prisma.article.findMany({
        where: {
            contentType: 'news',
            category: {
                contains: '[HIGH]'
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 10
    });
    return articles.map(article => {
        // Extract priority from category field
        const priorityMatch = article.category.match(/\[(HIGH|MEDIUM|LOW)\]/);
        const priority = priorityMatch ? priorityMatch[1].toLowerCase() : 'medium';
        // Extract platform and content type from category
        const categoryParts = article.category.split(' ');
        const platform = categoryParts[0];
        const contentType = categoryParts[1];
        return {
            url: article.url,
            title: article.question,
            content: article.answer,
            platform,
            category: article.category,
            contentType,
            priority,
            publishDate: undefined,
            author: article.author || undefined,
            summary: undefined,
            tags: undefined,
        };
    });
}
//# sourceMappingURL=news-policy.js.map