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
exports.scrapeSecondary = main;
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
async function scrapeTripAdvisorCommunity() {
    console.log('[SECONDARY] Starting TripAdvisor Community scraping...');
    try {
        const { crawlTripAdvisorCommunity } = await Promise.resolve().then(() => __importStar(require('../crawlers/tripadvisor-community')));
        const tripAdvisorPosts = await crawlTripAdvisorCommunity();
        console.log(`[SECONDARY] Found ${tripAdvisorPosts.length} TripAdvisor posts`);
        // Convert to Article format
        const articles = tripAdvisorPosts.map(post => ({
            url: post.url,
            question: post.question,
            answer: post.answer,
            platform: post.platform,
            category: post.category || 'TripAdvisor',
            contentType: 'community',
        }));
        return articles;
    }
    catch (error) {
        console.error('[SECONDARY] TripAdvisor Community scraping failed:', error);
        return [];
    }
}
async function scrapeStackOverflow() {
    console.log('[SECONDARY] Starting Stack Overflow scraping...');
    try {
        const { crawlStackOverflow } = await Promise.resolve().then(() => __importStar(require('../crawlers/stackoverflow')));
        const stackOverflowPosts = await crawlStackOverflow();
        console.log(`[SECONDARY] Found ${stackOverflowPosts.length} Stack Overflow posts`);
        // Convert to Article format
        const articles = stackOverflowPosts.map(post => ({
            url: post.url,
            question: post.question,
            answer: post.answer,
            platform: post.platform,
            category: post.category || 'StackOverflow',
            contentType: 'community',
        }));
        return articles;
    }
    catch (error) {
        console.error('[SECONDARY] Stack Overflow scraping failed:', error);
        return [];
    }
}
async function main() {
    console.log('[SECONDARY] Starting secondary scraping (TripAdvisor + StackOverflow)...');
    try {
        // Get existing URLs to avoid duplicates
        const existingUrls = await getExistingArticleUrls();
        console.log(`[SECONDARY] Found ${existingUrls.size} existing articles`);
        let allNewArticles = [];
        // 1. Scrape TripAdvisor Community
        console.log('[SECONDARY] ===== TRIPADVISOR COMMUNITY SCRAPING =====');
        const tripAdvisorArticles = await scrapeTripAdvisorCommunity();
        const newTripAdvisorArticles = tripAdvisorArticles.filter(article => !existingUrls.has(article.url));
        console.log(`[SECONDARY] ${newTripAdvisorArticles.length} new TripAdvisor articles`);
        allNewArticles = allNewArticles.concat(newTripAdvisorArticles);
        // 2. Scrape Stack Overflow
        console.log('[SECONDARY] ===== STACK OVERFLOW SCRAPING =====');
        const stackOverflowArticles = await scrapeStackOverflow();
        const newStackOverflowArticles = stackOverflowArticles.filter(article => !existingUrls.has(article.url));
        console.log(`[SECONDARY] ${newStackOverflowArticles.length} new Stack Overflow articles`);
        allNewArticles = allNewArticles.concat(newStackOverflowArticles);
        console.log(`[SECONDARY] Total new articles to save: ${allNewArticles.length}`);
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
                        console.error(`[SECONDARY] Error generating embedding for paragraph:`, error);
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
                    console.log(`[SECONDARY] Created ${paragraphsWithEmbeddings.length} paragraph embeddings`);
                }
                console.log(`[SECONDARY] Saved article: ${article.question}`);
            }
            catch (error) {
                console.error(`[SECONDARY] Error saving article ${article.url}:`, error);
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
        console.log('\n[SECONDARY] SCRAPING STATISTICS:');
        console.log('===============================');
        console.log(`Total articles in database: ${totalArticles.toLocaleString()}`);
        console.log(`Articles added today: ${todayArticles}`);
        console.log(`New articles this run: ${allNewArticles.length}`);
        console.log(`TripAdvisor articles: ${newTripAdvisorArticles.length}`);
        console.log(`StackOverflow articles: ${newStackOverflowArticles.length}`);
    }
    catch (error) {
        console.error('[SECONDARY] Secondary scraping failed:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the script
if (require.main === module) {
    main()
        .then(() => {
        console.log('[SECONDARY] Secondary scraping completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('[SECONDARY] Secondary scraping failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=scrape-secondary.js.map