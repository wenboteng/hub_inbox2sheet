"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const slugify_1 = require("../utils/slugify");
// Enhanced Prisma client with retry logic
class RetryablePrismaClient extends client_1.PrismaClient {
    constructor() {
        super(...arguments);
        this.maxRetries = 3;
        this.retryDelay = 5000; // 5 seconds
    }
    async connectWithRetry() {
        let lastError = null;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`[DB] Attempting database connection (attempt ${attempt}/${this.maxRetries})...`);
                await this.$connect();
                console.log(`[DB] Database connection successful on attempt ${attempt}`);
                return;
            }
            catch (error) {
                lastError = error;
                console.error(`[DB] Connection attempt ${attempt} failed:`, error);
                if (attempt < this.maxRetries) {
                    console.log(`[DB] Waiting ${this.retryDelay / 1000} seconds before retry...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                    // Increase delay for next attempt
                    this.retryDelay *= 1.5;
                }
            }
        }
        throw new Error(`Failed to connect to database after ${this.maxRetries} attempts. Last error: ${lastError?.message}`);
    }
    async queryWithRetry(queryFn) {
        let lastError = null;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await queryFn();
            }
            catch (error) {
                lastError = error;
                console.error(`[DB] Query attempt ${attempt} failed:`, error);
                // Check if it's a connection error
                if (error instanceof Error && (error.message.includes("Can't reach database server") ||
                    error.message.includes("Connection terminated") ||
                    error.message.includes("ECONNREFUSED") ||
                    error.message.includes("ENOTFOUND"))) {
                    if (attempt < this.maxRetries) {
                        console.log(`[DB] Connection error detected. Attempting to reconnect...`);
                        try {
                            await this.$disconnect();
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            await this.connectWithRetry();
                        }
                        catch (reconnectError) {
                            console.error(`[DB] Reconnection failed:`, reconnectError);
                        }
                    }
                }
                if (attempt < this.maxRetries) {
                    console.log(`[DB] Waiting ${this.retryDelay / 1000} seconds before retry...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                }
            }
        }
        throw new Error(`Query failed after ${this.maxRetries} attempts. Last error: ${lastError?.message}`);
    }
}
const prisma = new RetryablePrismaClient({
    log: ['error', 'warn'],
});
// Helper function to setup a page
async function setupPage(page) {
    await page.setViewport({
        width: 1280,
        height: 800
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setDefaultTimeout(120000);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
            request.abort();
        }
        else {
            request.continue();
        }
    });
    page.on('dialog', async (dialog) => {
        console.log(`[PUPPETEER] Dismissing dialog: ${dialog.message()}`);
        await dialog.dismiss();
    });
}
// Function to get existing article URLs from database with retry
async function getExistingArticleUrls() {
    return await prisma.queryWithRetry(async () => {
        const existingArticles = await prisma.article.findMany({
            select: { url: true },
        });
        return new Set(existingArticles.map((a) => a.url));
    });
}
// Function to log scraping statistics with retry
async function logScrapingStats() {
    await prisma.queryWithRetry(async () => {
        const totalArticles = await prisma.article.count();
        const officialArticles = await prisma.article.count({
            where: { contentType: 'official' },
        });
        const communityArticles = await prisma.article.count({
            where: { contentType: 'community' },
        });
        const platformStats = await prisma.article.groupBy({
            by: ['platform'],
            _count: { id: true },
        });
        console.log('\n📊 DATABASE STATISTICS:');
        console.log(`Total articles: ${totalArticles}`);
        console.log(`Official articles: ${officialArticles}`);
        console.log(`Community articles: ${communityArticles}`);
        console.log('\nPlatform breakdown:');
        platformStats.forEach((stat) => {
            console.log(`  ${stat.platform}: ${stat._count.id} articles`);
        });
    });
}
// Enhanced debug function to validate article data
function validateArticle(article, platform) {
    const issues = [];
    if (!article.url || article.url.trim() === '')
        issues.push('Empty or missing URL');
    if (!article.question || article.question.trim() === '')
        issues.push('Empty or missing question/title');
    if (!article.answer || article.answer.trim() === '')
        issues.push('Empty or missing answer/content');
    if (article.answer && article.answer.length < 50)
        issues.push(`Content too short (${article.answer.length} characters)`);
    if (!article.platform || article.platform.trim() === '')
        issues.push('Empty or missing platform');
    if (!article.category || article.category.trim() === '')
        issues.push('Empty or missing category');
    const isValid = issues.length === 0;
    if (!isValid) {
        console.log(`[DEBUG][${platform}] Article validation failed for ${article.url}:`);
        issues.forEach((issue) => console.log(`[DEBUG][${platform}]   - ${issue}`));
    }
    return { isValid, issues };
}
// Generates a unique slug, handling potential collisions with retry
async function generateUniqueSlug(title) {
    return await prisma.queryWithRetry(async () => {
        let slug = (0, slugify_1.slugify)(title);
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 5) {
            const existingSlug = await prisma.article.findUnique({ where: { slug } });
            if (existingSlug) {
                console.log(`[SLUG] Slug conflict detected for "${slug}". Generating a new one.`);
                const randomSuffix = (0, crypto_1.randomBytes)(3).toString('hex'); // e.g., 'a1b2c3'
                slug = `${(0, slugify_1.slugify)(title)}-${randomSuffix}`;
                attempts++;
            }
            else {
                isUnique = true;
            }
        }
        if (!isUnique) {
            // Final fallback to a completely random slug
            const finalSuffix = (0, crypto_1.randomBytes)(6).toString('hex');
            slug = `article-${finalSuffix}`;
            console.log(`[SLUG] Using fallback slug: ${slug}`);
        }
        return slug;
    });
}
// Main scraping function with enhanced error handling
async function main() {
    console.log('[SCRAPE] Starting comprehensive scraping with retry logic...');
    try {
        // Connect to database with retry
        await prisma.connectWithRetry();
        console.log('[SCRAPE] Database connection established successfully');
        // Get existing URLs to avoid duplicates
        const existingUrls = await getExistingArticleUrls();
        console.log(`[SCRAPE] Found ${existingUrls.size} existing articles`);
        // For now, let's just test the database connection and skip actual scraping
        // to avoid overwhelming the system while we debug the connection issue
        console.log('[SCRAPE] Database connection test successful - skipping actual scraping for now');
        // Log final statistics
        await logScrapingStats();
    }
    catch (error) {
        console.error('[SCRAPE] Error in main scraping function:', error);
        // Provide detailed error information
        if (error instanceof Error) {
            console.error('[SCRAPE] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }
        throw error;
    }
    finally {
        await prisma.$disconnect();
        console.log('[SCRAPE] Database connection closed');
    }
}
// Run the main function if this file is executed directly
if (require.main === module) {
    main().then(() => {
        console.log('[SCRAPE] Scraping completed successfully');
        process.exit(0);
    }).catch((error) => {
        console.error('[SCRAPE] Scraping failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=scrape-with-retry.js.map