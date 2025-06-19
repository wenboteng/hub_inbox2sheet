"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const openai_1 = require("../utils/openai");
const airbnb_1 = require("../scripts/scrapers/airbnb");
const getyourguide_1 = require("../crawlers/getyourguide");
const communityCrawler_1 = require("../lib/communityCrawler");
const prisma = new client_1.PrismaClient();
// List of URLs to scrape
const URLs = [
    // GetYourGuide supplier help center articles
    'https://supply.getyourguide.support/hc/en-us/articles/13980989354141-Self-canceling-bookings',
    'https://supply.getyourguide.support/hc/en-us/articles/13980989354141-How-do-I-modify-a-booking',
    'https://supply.getyourguide.support/hc/en-us/articles/13980989354141-How-do-I-issue-a-refund'
];
async function main() {
    try {
        console.log('[SCRAPE] Starting scrape process...');
        console.log('[SCRAPE] Environment:', process.env.NODE_ENV || 'development');
        console.log('[SCRAPE] Chrome executable path:', process.env.PUPPETEER_EXECUTABLE_PATH || 'not set');
        // Test database connection
        try {
            await prisma.$connect();
            console.log('[SCRAPE] Database connection successful');
        }
        catch (dbError) {
            console.error('[SCRAPE] Database connection failed:', dbError);
            throw dbError;
        }
        // Scrape articles from different platforms
        console.log('[SCRAPE] Starting Airbnb scraping...');
        let airbnbArticles = [];
        try {
            airbnbArticles = await (0, airbnb_1.scrapeAirbnb)();
            console.log(`[SCRAPE] Airbnb scraping completed. Found ${airbnbArticles.length} articles`);
        }
        catch (airbnbError) {
            console.error('[SCRAPE] Airbnb scraping failed:', airbnbError);
            // Continue with other scrapers even if Airbnb fails
        }
        console.log('[SCRAPE] Starting GetYourGuide scraping...');
        let gygArticles = [];
        try {
            // Use the robust crawler version
            const crawled = await (0, getyourguide_1.crawlGetYourGuideArticles)();
            // Map to Article type with a default category if needed
            gygArticles = crawled.map(a => ({
                ...a,
                category: 'Help Center', // or extract category if available
            }));
            console.log(`[SCRAPE] GetYourGuide crawling completed. Found ${gygArticles.length} articles`);
        }
        catch (gygError) {
            console.error('[SCRAPE] GetYourGuide crawling failed:', gygError);
            // Continue with other scrapers even if GetYourGuide fails
        }
        // Scrape community content
        console.log('[SCRAPE] Starting community content scraping...');
        try {
            const communityUrls = await (0, communityCrawler_1.getCommunityContentUrls)();
            console.log(`[SCRAPE] Found ${communityUrls.length} community URLs to scrape`);
            // Note: scrapeCommunityUrls handles its own database operations
            // so we don't need to process the results here
            await (0, communityCrawler_1.scrapeCommunityUrls)(communityUrls);
            console.log('[SCRAPE] Community content scraping completed');
        }
        catch (communityError) {
            console.error('[SCRAPE] Community content scraping failed:', communityError);
            // Continue even if community scraping fails
        }
        const articles = [...airbnbArticles, ...gygArticles];
        console.log(`[SCRAPE] Total official articles found: ${articles.length}`);
        if (articles.length === 0) {
            console.log('[SCRAPE] No official articles found, but community content may have been scraped.');
        }
        // Process each official article
        for (const article of articles) {
            try {
                // Check if article exists and if content has changed
                const existing = await prisma.article.findUnique({ where: { url: article.url } });
                if (existing && existing.answer === article.answer) {
                    console.log(`[SCRAPE] Skipping unchanged article: ${article.question}`);
                    continue;
                }
                console.log(`[SCRAPE] Processing article: ${article.question}`);
                // Generate embeddings for paragraphs
                let paragraphsWithEmbeddings = [];
                try {
                    paragraphsWithEmbeddings = await (0, openai_1.getContentEmbeddings)(article.answer);
                    console.log(`[SCRAPE] Generated embeddings for ${paragraphsWithEmbeddings.length} paragraphs`);
                }
                catch (embeddingError) {
                    console.error('[SCRAPE] Failed to generate embeddings:', embeddingError);
                    // Continue without embeddings
                }
                // Upsert article (without paragraphs)
                const upserted = await prisma.article.upsert({
                    where: { url: article.url },
                    update: {
                        question: article.question,
                        answer: article.answer,
                        category: article.category,
                        platform: article.platform,
                        contentType: 'official', // Ensure official content type
                        source: 'help_center',
                        lastUpdated: new Date(),
                    },
                    create: {
                        url: article.url,
                        question: article.question,
                        answer: article.answer,
                        category: article.category,
                        platform: article.platform,
                        contentType: 'official',
                        source: 'help_center',
                    },
                });
                console.log(`[SCRAPE] Article upserted with ID: ${upserted.id}`);
                // Delete old paragraphs
                await prisma.articleParagraph.deleteMany({ where: { articleId: upserted.id } });
                // Create new paragraphs if embeddings were generated
                if (paragraphsWithEmbeddings.length > 0) {
                    await prisma.articleParagraph.createMany({
                        data: paragraphsWithEmbeddings.map(p => ({
                            articleId: upserted.id,
                            text: p.text,
                            embedding: p.embedding,
                        })),
                    });
                    console.log(`[SCRAPE] Created ${paragraphsWithEmbeddings.length} paragraph embeddings`);
                }
                console.log(`[SCRAPE] Successfully processed article: ${article.question}`);
            }
            catch (articleError) {
                console.error(`[SCRAPE] Error processing article ${article.url}:`, articleError);
                // Continue with next article
            }
        }
        console.log('[SCRAPE] Scrape process completed successfully');
    }
    catch (error) {
        console.error('[SCRAPE] Error during scrape:', error);
        process.exit(1);
    }
    finally {
        try {
            await prisma.$disconnect();
            console.log('[SCRAPE] Database connection closed');
        }
        catch (disconnectError) {
            console.error('[SCRAPE] Error disconnecting from database:', disconnectError);
        }
    }
}
main();
