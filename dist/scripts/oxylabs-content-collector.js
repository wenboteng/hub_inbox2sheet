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
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const client_1 = require("@prisma/client");
const oxylabs_1 = require("../lib/oxylabs");
const languageDetection_1 = require("../utils/languageDetection");
const slugify_1 = require("../utils/slugify");
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
const prisma = new client_1.PrismaClient();
// Content collection configuration
const CONTENT_SOURCES = {
    // OTA Official Help Centers
    ota_help: {
        name: 'OTA Help Centers',
        sources: [
            {
                name: 'Airbnb Help Center',
                platform: 'airbnb',
                urls: [
                    'https://www.airbnb.com/help/article/2853',
                    'https://www.airbnb.com/help/article/2854',
                    'https://www.airbnb.com/help/article/2855',
                    'https://www.airbnb.com/help/article/2856',
                    'https://www.airbnb.com/help/article/2857',
                    'https://www.airbnb.com/help/article/2858',
                    'https://www.airbnb.com/help/article/2859',
                    'https://www.airbnb.com/help/article/2860',
                ],
                category: 'Pricing & Revenue',
            },
            {
                name: 'GetYourGuide Partner Center',
                platform: 'getyourguide',
                urls: [
                    'https://supply.getyourguide.support/hc/en-us/articles/360000684857',
                    'https://supply.getyourguide.support/hc/en-us/articles/360000684858',
                    'https://supply.getyourguide.support/hc/en-us/articles/360000684859',
                    'https://supply.getyourguide.support/hc/en-us/articles/360000684860',
                ],
                category: 'Technical Setup',
            },
            {
                name: 'Viator Partner Help',
                platform: 'viator',
                urls: [
                    'https://www.viator.com/help/partner',
                    'https://www.viator.com/help/partner/pricing',
                    'https://www.viator.com/help/partner/marketing',
                ],
                category: 'Marketing & SEO',
            },
        ],
    },
    // Community Platforms
    community: {
        name: 'Community Forums',
        sources: [
            {
                name: 'Reddit Travel Communities',
                platform: 'reddit',
                categories: ['travel', 'hosting', 'tourism'],
                maxPages: 3,
                category: 'Community Insights',
            },
            {
                name: 'Quora Travel Topics',
                platform: 'quora',
                categories: ['Travel', 'Hospitality', 'Tourism'],
                maxPages: 2,
                category: 'Expert Advice',
            },
            {
                name: 'Stack Overflow',
                platform: 'stackoverflow',
                categories: ['travel', 'hospitality'],
                maxPages: 2,
                category: 'Technical Solutions',
            },
        ],
    },
    // Search-based discovery
    search: {
        name: 'Search Discovery',
        queries: [
            'tour vendor pricing strategies',
            'how to increase bookings on Airbnb',
            'tour operator marketing tips',
            'travel business customer service',
            'tour cancellation policies',
            'travel business legal requirements',
            'tour operator SEO strategies',
            'travel business revenue optimization',
            'tour vendor platform comparison',
            'travel business startup guide',
        ],
        platform: 'google',
        maxResults: 10,
    },
};
// FAQ Categories for tour vendors
const FAQ_CATEGORIES = [
    {
        name: 'Pricing & Revenue',
        description: 'Strategies for pricing tours, revenue optimization, and financial management',
        priority: 1,
        icon: '💰',
        color: '#10B981',
    },
    {
        name: 'Marketing & SEO',
        description: 'Digital marketing, SEO strategies, and promotional techniques',
        priority: 2,
        icon: '📈',
        color: '#3B82F6',
    },
    {
        name: 'Customer Service',
        description: 'Guest relations, customer support, and service excellence',
        priority: 3,
        icon: '🎯',
        color: '#F59E0B',
    },
    {
        name: 'Technical Setup',
        description: 'Platform configuration, technical requirements, and system setup',
        priority: 4,
        icon: '⚙️',
        color: '#8B5CF6',
    },
    {
        name: 'Booking & Cancellations',
        description: 'Reservation management, cancellation policies, and booking optimization',
        priority: 5,
        icon: '📅',
        color: '#EF4444',
    },
    {
        name: 'Policies & Legal',
        description: 'Legal requirements, terms of service, and compliance',
        priority: 6,
        icon: '⚖️',
        color: '#6B7280',
    },
    {
        name: 'Community Insights',
        description: 'Real experiences and advice from the travel community',
        priority: 7,
        icon: '👥',
        color: '#EC4899',
    },
    {
        name: 'Expert Advice',
        description: 'Professional insights and industry best practices',
        priority: 8,
        icon: '🎓',
        color: '#059669',
    },
    {
        name: 'Technical Solutions',
        description: 'Technical problems and their solutions',
        priority: 9,
        icon: '🔧',
        color: '#DC2626',
    },
    {
        name: 'General',
        description: 'General questions and miscellaneous topics',
        priority: 10,
        icon: '📚',
        color: '#9CA3AF',
    },
];
/**
 * Initialize FAQ categories in the database
 */
async function initializeFAQCategories() {
    console.log('🏗️ Initializing FAQ categories...');
    try {
        // Store categories in the Report table
        await prisma.report.upsert({
            where: { type: 'faq_categories' },
            update: {
                title: 'FAQ Categories',
                content: JSON.stringify(FAQ_CATEGORIES),
                updatedAt: new Date(),
            },
            create: {
                type: 'faq_categories',
                title: 'FAQ Categories',
                content: JSON.stringify(FAQ_CATEGORIES),
                slug: 'faq-categories',
            },
        });
        console.log('✅ FAQ categories initialized successfully');
    }
    catch (error) {
        console.log('❌ Failed to initialize FAQ categories:', error);
    }
}
/**
 * Process and save content to database
 */
async function processContent(content) {
    try {
        // Check if content already exists
        const existing = await prisma.article.findFirst({
            where: {
                source: content.url,
                contentType: 'faq'
            },
        });
        if (existing) {
            console.log(`⏭️ Content already exists: ${content.url}`);
            return false;
        }
        // Detect language
        const language = await (0, languageDetection_1.detectLanguage)(content.content);
        if (language.language !== 'en') {
            console.log(`🌍 Non-English content detected (${language.language}): ${content.url}`);
            return false;
        }
        // Calculate content quality score
        const qualityScore = calculateContentQuality(content);
        // Create article (using existing Article table)
        await prisma.article.create({
            data: {
                question: content.title,
                answer: content.content,
                category: content.category,
                platform: content.platform,
                source: content.url,
                contentType: 'faq',
                votes: qualityScore,
                isVerified: content.contentType === 'official',
                lastUpdated: new Date(),
                url: content.url,
                slug: (0, slugify_1.slugify)(content.title),
            },
        });
        console.log(`✅ Saved content: ${content.title}`);
        return true;
    }
    catch (error) {
        console.error(`❌ Failed to process content: ${content.url}`, error);
        return false;
    }
}
/**
 * Calculate content quality score
 */
function calculateContentQuality(content) {
    let score = 50; // Base score
    // Content length bonus
    const contentLength = content.content.length;
    if (contentLength > 1000)
        score += 20;
    else if (contentLength > 500)
        score += 10;
    // Title quality
    if (content.title.length > 20)
        score += 10;
    // Platform credibility
    if (content.platform === 'airbnb' || content.platform === 'getyourguide') {
        score += 15;
    }
    // Content type bonus
    if (content.contentType === 'official')
        score += 15;
    return Math.min(score, 100);
}
/**
 * Determine content difficulty level
 */
function determineDifficulty(content) {
    const contentLength = content.content.length;
    const hasTechnicalTerms = /api|integration|configuration|setup/i.test(content.content);
    if (contentLength > 2000 || hasTechnicalTerms)
        return 'advanced';
    if (contentLength > 1000)
        return 'intermediate';
    return 'beginner';
}
/**
 * Estimate reading time in minutes
 */
function estimateReadingTime(content) {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    return Math.ceil(wordCount / wordsPerMinute);
}
/**
 * Collect content from OTA help centers
 */
async function collectOTAHelpContent() {
    console.log('🏢 Collecting OTA help center content...');
    let processedCount = 0;
    for (const source of CONTENT_SOURCES.ota_help.sources) {
        console.log(`📋 Processing ${source.name}...`);
        for (let i = 0; i < source.urls.length; i++) {
            const url = source.urls[i];
            console.log(`[OXYLABS] Processing ${i + 1}/${source.urls.length}: ${url}`);
            try {
                const content = await oxylabs_1.oxylabsScraper.scrapeUrl(url, source.platform);
                if (content) {
                    content.category = source.category;
                    const saved = await processContent(content);
                    if (saved)
                        processedCount++;
                }
            }
            catch (error) {
                console.log(`[OXYLABS] Error scraping ${url}:`, error);
            }
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    return processedCount;
}
/**
 * Collect content from community platforms
 */
async function collectCommunityContent() {
    console.log('👥 Collecting community content...');
    let processedCount = 0;
    for (const source of CONTENT_SOURCES.community.sources) {
        console.log(`📋 Processing ${source.name}...`);
        for (const category of source.categories) {
            for (let page = 1; page <= source.maxPages; page++) {
                const url = generateCommunityUrl(source.platform, category, page);
                console.log(`[OXYLABS] Processing ${page}/${source.maxPages}: ${url}`);
                try {
                    const content = await oxylabs_1.oxylabsScraper.scrapeUrl(url, source.platform);
                    if (content) {
                        content.category = source.category;
                        const saved = await processContent(content);
                        if (saved)
                            processedCount++;
                    }
                }
                catch (error) {
                    console.log(`[OXYLABS] Error scraping ${url}:`, error);
                }
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    }
    return processedCount;
}
/**
 * Generate community platform URLs
 */
function generateCommunityUrl(platform, category, page) {
    switch (platform) {
        case 'reddit':
            return `https://www.reddit.com/r/${category}/hot.json?limit=25&after=${page}`;
        case 'quora':
            return `https://www.quora.com/topic/${category}`;
        case 'stackoverflow':
            return `https://stackoverflow.com/questions/tagged/${category}?tab=votes&page=${page}`;
        default:
            return '';
    }
}
/**
 * Collect content through search discovery
 */
async function collectSearchContent() {
    console.log('🔍 Collecting content through search discovery...');
    let processedCount = 0;
    for (const query of CONTENT_SOURCES.search.queries) {
        console.log(`🔍 Searching for: "${query}"`);
        try {
            const results = await oxylabs_1.oxylabsScraper.searchContent(query, 'google');
            for (const content of results.slice(0, CONTENT_SOURCES.search.maxResults)) {
                content.category = 'General'; // Default category for search results
                const saved = await processContent(content);
                if (saved)
                    processedCount++;
            }
        }
        catch (error) {
            console.log(`❌ Search failed for "${query}":`, error);
        }
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    return processedCount;
}
/**
 * Generate insights and analytics
 */
async function generateInsights() {
    console.log('📊 Generating insights and analytics...');
    try {
        // Get total questions count
        const totalQuestions = await prisma.article.count({
            where: { contentType: 'faq' }
        });
        // Get top questions
        const topQuestions = await prisma.article.findMany({
            where: { contentType: 'faq' },
            orderBy: { votes: 'desc' },
            take: 10,
        });
        // Get platform distribution
        const platformStats = await prisma.article.groupBy({
            by: ['platform'],
            where: { contentType: 'faq' },
            _count: { platform: true },
        });
        // Get category distribution
        const categoryStats = await prisma.article.groupBy({
            by: ['category'],
            where: { contentType: 'faq' },
            _count: { category: true },
        });
        // Save insights to Report table
        const insights = {
            totalQuestions,
            topQuestions: topQuestions.map(q => ({ question: q.question, votes: q.votes })),
            platformDistribution: platformStats.map(p => ({ platform: p.platform, count: p._count.platform })),
            categoryDistribution: categoryStats.map(c => ({ category: c.category, count: c._count.category })),
            lastUpdated: new Date().toISOString(),
        };
        await prisma.report.upsert({
            where: { type: 'faq_insights' },
            update: {
                title: 'FAQ Insights',
                content: JSON.stringify(insights),
                updatedAt: new Date(),
            },
            create: {
                type: 'faq_insights',
                title: 'FAQ Insights',
                content: JSON.stringify(insights),
                slug: 'faq-insights',
            },
        });
        console.log('✅ Insights generated successfully');
    }
    catch (error) {
        console.error('❌ Failed to generate insights:', error);
    }
}
/**
 * Main collection function
 */
async function main() {
    console.log('🚀 Starting Oxylabs content collection for tour vendors...');
    try {
        await prisma.$connect();
        console.log('✅ Database connected');
        // Initialize FAQ categories
        await initializeFAQCategories();
        console.log('📚 Starting content collection...');
        // Collect OTA help center content
        const otaCount = await collectOTAHelpContent();
        console.log(`✅ OTA Help Centers: ${otaCount} articles processed`);
        // Collect community content
        const communityCount = await collectCommunityContent();
        console.log(`✅ Community Content: ${communityCount} articles processed`);
        // Collect search-based content
        const searchCount = await collectSearchContent();
        console.log(`✅ Search Discovery: ${searchCount} articles processed`);
        // Generate insights
        await generateInsights();
        console.log('🎉 Content collection completed successfully!');
    }
    catch (error) {
        console.error('❌ Content collection failed:', error);
    }
    finally {
        await prisma.$disconnect();
        console.log('🔌 Database disconnected');
    }
}
// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=oxylabs-content-collector.js.map