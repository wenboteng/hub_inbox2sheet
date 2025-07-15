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
const client_1 = require("@prisma/client");
const languageDetection_1 = require("../utils/languageDetection");
const openai_1 = require("../utils/openai");
const prisma = new client_1.PrismaClient();
async function getExistingArticleUrls() {
    const articles = await prisma.article.findMany({ select: { url: true } });
    return new Set(articles.map(article => article.url));
}
async function generateUniqueSlug(title) {
    const baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 60);
    const existing = await prisma.article.findFirst({
        where: { slug: baseSlug }
    });
    if (!existing)
        return baseSlug;
    let counter = 1;
    while (true) {
        const newSlug = `${baseSlug}-${counter}`;
        const exists = await prisma.article.findFirst({
            where: { slug: newSlug }
        });
        if (!exists)
            return newSlug;
        counter++;
    }
}
async function scrapeAirbnbCommunity() {
    console.log('[MAIN] Starting Airbnb Community scraping...');
    try {
        const { scrapeAirbnbCommunity } = await Promise.resolve().then(() => __importStar(require('./scrape')));
        const articles = await scrapeAirbnbCommunity();
        console.log(`[MAIN] Found ${articles.length} Airbnb Community articles`);
        return articles;
    }
    catch (error) {
        console.error('[MAIN] Airbnb Community scraping failed:', error);
        return [];
    }
}
async function scrapeRedditEnhanced() {
    console.log('[MAIN] Starting Enhanced Reddit scraping...');
    try {
        const { crawlRedditEnhanced } = await Promise.resolve().then(() => __importStar(require('../crawlers/reddit-enhanced')));
        const redditStats = await crawlRedditEnhanced();
        console.log(`[MAIN] Enhanced Reddit crawl completed:`);
        console.log(`  - Subreddits processed: ${redditStats.subredditsProcessed}`);
        console.log(`  - Posts discovered: ${redditStats.postsDiscovered}`);
        console.log(`  - Posts extracted: ${redditStats.postsExtracted}`);
        console.log(`  - Comments extracted: ${redditStats.commentsExtracted}`);
        console.log(`  - Total requests: ${redditStats.totalRequests}`);
        console.log(`  - Rate limit hits: ${redditStats.rateLimitHits}`);
        // The reddit-enhanced crawler saves directly to database
        // We'll return an empty array since articles are already saved
        console.log(`[MAIN] Reddit articles saved directly to database by crawler`);
        return [];
    }
    catch (error) {
        console.error('[MAIN] Enhanced Reddit scraping failed:', error);
        return [];
    }
}
async function main() {
    console.log('[MAIN] Starting main scraping (Reddit + Airbnb)...');
    try {
        // Get existing URLs to avoid duplicates
        const existingUrls = await getExistingArticleUrls();
        console.log(`[MAIN] Found ${existingUrls.size} existing articles`);
        let allNewArticles = [];
        // 1. Scrape Reddit (Enhanced) - saves directly to database
        console.log('[MAIN] ===== REDDIT ENHANCED SCRAPING =====');
        await scrapeRedditEnhanced();
        console.log(`[MAIN] Reddit articles processed and saved directly to database`);
        // 2. Scrape Airbnb Community
        console.log('[MAIN] ===== AIRBNB COMMUNITY SCRAPING =====');
        const airbnbArticles = await scrapeAirbnbCommunity();
        const newAirbnbArticles = airbnbArticles.filter(article => !existingUrls.has(article.url));
        console.log(`[MAIN] ${newAirbnbArticles.length} new Airbnb articles`);
        allNewArticles = allNewArticles.concat(newAirbnbArticles);
        console.log(`[MAIN] Total new articles to save: ${allNewArticles.length}`);
        // Save all new articles to database
        for (const article of allNewArticles) {
            try {
                // Generate unique slug
                const slug = await generateUniqueSlug(article.question);
                // Detect language
                const languageDetection = (0, languageDetection_1.detectLanguage)(article.answer);
                // Generate embeddings for content
                const paragraphs = article.answer.split('\n\n').filter(p => p.trim().length > 50);
                const paragraphsWithEmbeddings = [];
                for (const paragraph of paragraphs.slice(0, 5)) {
                    try {
                        const embedding = await (0, openai_1.getEmbedding)(paragraph);
                        paragraphsWithEmbeddings.push({ text: paragraph, embedding });
                    }
                    catch (error) {
                        console.error(`[MAIN] Error generating embedding for paragraph:`, error);
                    }
                }
                // Create article
                const created = await prisma.article.create({
                    data: {
                        url: article.url,
                        question: article.question,
                        answer: article.answer,
                        slug,
                        category: article.category,
                        platform: article.platform,
                        contentType: article.contentType,
                        source: 'community',
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
                    console.log(`[MAIN] Created ${paragraphsWithEmbeddings.length} paragraph embeddings`);
                }
                console.log(`[MAIN] Saved article: ${article.question}`);
            }
            catch (error) {
                console.error(`[MAIN] Error saving article ${article.url}:`, error);
            }
        }
        // Log final statistics
        const totalArticles = await prisma.article.count();
        const todayArticles = await prisma.article.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }
        });
        console.log('\n[MAIN] SCRAPING STATISTICS:');
        console.log('==========================');
        console.log(`Total articles in database: ${totalArticles.toLocaleString()}`);
        console.log(`Articles added today: ${todayArticles}`);
        console.log(`New articles this run: ${allNewArticles.length}`);
        console.log(`Airbnb articles: ${newAirbnbArticles.length}`);
    }
    catch (error) {
        console.error('[MAIN] Error in main scraping function:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the main function if this file is executed directly
if (require.main === module) {
    main().then(() => {
        console.log('[MAIN] Main scraping completed successfully');
        process.exit(0);
    }).catch((error) => {
        console.error('[MAIN] Main scraping failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=scrape-main.js.map