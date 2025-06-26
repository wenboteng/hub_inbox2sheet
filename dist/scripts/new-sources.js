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
const openai_1 = require("../utils/openai");
const contentDeduplication_1 = require("../utils/contentDeduplication");
const languageDetection_1 = require("../utils/languageDetection");
const slugify_1 = require("../utils/slugify");
const crypto_1 = require("crypto");
const prisma = new client_1.PrismaClient();
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
// Function to get existing article URLs from database
async function getExistingArticleUrls() {
    const existingArticles = await prisma.article.findMany({
        select: { url: true },
    });
    return new Set(existingArticles.map((a) => a.url));
}
// Scrape TripAdvisor help center
async function scrapeTripAdvisor() {
    console.log('[NEW-SOURCES] Starting TripAdvisor scraping...');
    const articles = [];
    try {
        const { createBrowser } = await Promise.resolve().then(() => __importStar(require('../utils/puppeteer')));
        const browser = await createBrowser();
        try {
            const page = await browser.newPage();
            await setupPage(page);
            // TripAdvisor help center URLs
            const helpUrls = [
                'https://tripadvisor.mediasoup.com/help',
                'https://tripadvisor.mediasoup.com/help/booking',
                'https://tripadvisor.mediasoup.com/help/payment',
                'https://tripadvisor.mediasoup.com/help/cancellation',
                'https://tripadvisor.mediasoup.com/help/refund',
                'https://tripadvisor.mediasoup.com/help/contact',
            ];
            for (const helpUrl of helpUrls) {
                try {
                    console.log(`[NEW-SOURCES] Scraping ${helpUrl}...`);
                    await page.goto(helpUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    const articleData = await page.evaluate(() => {
                        const title = document.querySelector('h1, .title, .page-title')?.textContent?.trim() || '';
                        const content = document.querySelector('.content, .body, .help-content')?.textContent?.trim() || '';
                        return { title, content };
                    });
                    if (articleData.title && articleData.content && articleData.content.length > 100) {
                        articles.push({
                            url: helpUrl,
                            question: articleData.title,
                            answer: articleData.content,
                            platform: 'TripAdvisor',
                            category: 'Help Center',
                            contentType: 'official'
                        });
                        console.log(`[NEW-SOURCES] Scraped TripAdvisor: ${articleData.title}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                catch (error) {
                    console.error(`[NEW-SOURCES] Error scraping TripAdvisor ${helpUrl}:`, error);
                }
            }
            await page.close();
        }
        finally {
            await browser.close();
        }
    }
    catch (error) {
        console.error('[NEW-SOURCES] Failed to create browser for TripAdvisor:', error);
    }
    console.log(`[NEW-SOURCES] TripAdvisor scraping completed. Found ${articles.length} articles`);
    return articles;
}
// Scrape Booking.com help center
async function scrapeBooking() {
    console.log('[NEW-SOURCES] Starting Booking.com scraping...');
    const articles = [];
    try {
        const { createBrowser } = await Promise.resolve().then(() => __importStar(require('../utils/puppeteer')));
        const browser = await createBrowser();
        try {
            const page = await browser.newPage();
            await setupPage(page);
            // Booking.com help center URLs
            const helpUrls = [
                'https://www.booking.com/content/help.html',
                'https://www.booking.com/content/help/booking.html',
                'https://www.booking.com/content/help/payment.html',
                'https://www.booking.com/content/help/cancellation.html',
                'https://www.booking.com/content/help/refund.html',
                'https://www.booking.com/content/help/contact.html',
            ];
            for (const helpUrl of helpUrls) {
                try {
                    console.log(`[NEW-SOURCES] Scraping ${helpUrl}...`);
                    await page.goto(helpUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    const articleData = await page.evaluate(() => {
                        const title = document.querySelector('h1, .title, .page-title')?.textContent?.trim() || '';
                        const content = document.querySelector('.content, .body, .help-content')?.textContent?.trim() || '';
                        return { title, content };
                    });
                    if (articleData.title && articleData.content && articleData.content.length > 100) {
                        articles.push({
                            url: helpUrl,
                            question: articleData.title,
                            answer: articleData.content,
                            platform: 'Booking.com',
                            category: 'Help Center',
                            contentType: 'official'
                        });
                        console.log(`[NEW-SOURCES] Scraped Booking.com: ${articleData.title}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                catch (error) {
                    console.error(`[NEW-SOURCES] Error scraping Booking.com ${helpUrl}:`, error);
                }
            }
            await page.close();
        }
        finally {
            await browser.close();
        }
    }
    catch (error) {
        console.error('[NEW-SOURCES] Failed to create browser for Booking.com:', error);
    }
    console.log(`[NEW-SOURCES] Booking.com scraping completed. Found ${articles.length} articles`);
    return articles;
}
// Scrape Reddit travel communities
async function scrapeReddit() {
    console.log('[NEW-SOURCES] Starting Reddit scraping...');
    const articles = [];
    try {
        const { createBrowser } = await Promise.resolve().then(() => __importStar(require('../utils/puppeteer')));
        const browser = await createBrowser();
        try {
            const page = await browser.newPage();
            await setupPage(page);
            // Reddit travel communities
            const redditUrls = [
                'https://www.reddit.com/r/travel/',
                'https://www.reddit.com/r/backpacking/',
                'https://www.reddit.com/r/solotravel/',
                'https://www.reddit.com/r/digitalnomad/',
                'https://www.reddit.com/r/travelpartners/',
            ];
            for (const redditUrl of redditUrls) {
                try {
                    console.log(`[NEW-SOURCES] Scraping ${redditUrl}...`);
                    await page.goto(redditUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    // Extract top posts
                    const posts = await page.$$eval('h3, .title, [data-testid="post-title"]', (elements) => elements.slice(0, 10).map((el) => ({
                        title: el.textContent?.trim() || '',
                        url: el.closest('a')?.href || ''
                    })));
                    for (const post of posts) {
                        if (post.title && post.url && post.title.length > 10) {
                            try {
                                await page.goto(post.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                                const postContent = await page.evaluate(() => {
                                    const content = document.querySelector('.content, .body, [data-testid="post-content"]')?.textContent?.trim() || '';
                                    return content;
                                });
                                if (postContent && postContent.length > 100) {
                                    articles.push({
                                        url: post.url,
                                        question: post.title,
                                        answer: postContent,
                                        platform: 'Reddit',
                                        category: 'Travel Community',
                                        contentType: 'community'
                                    });
                                    console.log(`[NEW-SOURCES] Scraped Reddit: ${post.title}`);
                                }
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                            catch (error) {
                                console.error(`[NEW-SOURCES] Error scraping Reddit post ${post.url}:`, error);
                            }
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                catch (error) {
                    console.error(`[NEW-SOURCES] Error scraping Reddit ${redditUrl}:`, error);
                }
            }
            await page.close();
        }
        finally {
            await browser.close();
        }
    }
    catch (error) {
        console.error('[NEW-SOURCES] Failed to create browser for Reddit:', error);
    }
    console.log(`[NEW-SOURCES] Reddit scraping completed. Found ${articles.length} articles`);
    return articles;
}
// Scrape Quora travel topics
async function scrapeQuora() {
    console.log('[NEW-SOURCES] Starting Quora scraping...');
    const articles = [];
    try {
        const { createBrowser } = await Promise.resolve().then(() => __importStar(require('../utils/puppeteer')));
        const browser = await createBrowser();
        try {
            const page = await browser.newPage();
            await setupPage(page);
            // Quora travel topics
            const quoraUrls = [
                'https://www.quora.com/topic/Travel',
                'https://www.quora.com/topic/Vacation-Rentals',
                'https://www.quora.com/topic/Backpacking',
                'https://www.quora.com/topic/Solo-Travel',
                'https://www.quora.com/topic/Budget-Travel',
            ];
            for (const quoraUrl of quoraUrls) {
                try {
                    console.log(`[NEW-SOURCES] Scraping ${quoraUrl}...`);
                    await page.goto(quoraUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    // Extract questions
                    const questions = await page.$$eval('a[href*="/topic/"]', (links) => links.slice(0, 10).map((link) => ({
                        title: link.textContent?.trim() || '',
                        url: link.href || ''
                    })));
                    for (const question of questions) {
                        if (question.title && question.url && question.title.length > 10) {
                            try {
                                await page.goto(question.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                                const answerContent = await page.evaluate(() => {
                                    const content = document.querySelector('.content, .answer, [data-testid="answer-content"]')?.textContent?.trim() || '';
                                    return content;
                                });
                                if (answerContent && answerContent.length > 100) {
                                    articles.push({
                                        url: question.url,
                                        question: question.title,
                                        answer: answerContent,
                                        platform: 'Quora',
                                        category: 'Travel Q&A',
                                        contentType: 'community'
                                    });
                                    console.log(`[NEW-SOURCES] Scraped Quora: ${question.title}`);
                                }
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                            catch (error) {
                                console.error(`[NEW-SOURCES] Error scraping Quora question ${question.url}:`, error);
                            }
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                catch (error) {
                    console.error(`[NEW-SOURCES] Error scraping Quora ${quoraUrl}:`, error);
                }
            }
            await page.close();
        }
        finally {
            await browser.close();
        }
    }
    catch (error) {
        console.error('[NEW-SOURCES] Failed to create browser for Quora:', error);
    }
    console.log(`[NEW-SOURCES] Quora scraping completed. Found ${articles.length} articles`);
    return articles;
}
// Generates a unique slug, handling potential collisions.
async function generateUniqueSlug(title) {
    let slug = (0, slugify_1.slugify)(title);
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
        const existingSlug = await prisma.article.findUnique({ where: { slug } });
        if (existingSlug) {
            console.log(`[SLUG] Slug conflict detected for "${slug}". Generating a new one.`);
            const randomSuffix = (0, crypto_1.randomBytes)(3).toString('hex');
            slug = `${(0, slugify_1.slugify)(title)}-${randomSuffix}`;
            attempts++;
        }
        else {
            isUnique = true;
        }
    }
    if (!isUnique) {
        const finalSuffix = (0, crypto_1.randomBytes)(6).toString('hex');
        slug = `article-${finalSuffix}`;
        console.log(`[SLUG] Could not generate a unique slug for title "${title}". Using fallback: ${slug}`);
    }
    return slug;
}
async function main() {
    try {
        console.log('[NEW-SOURCES] Starting new sources scraping process...');
        await prisma.$connect();
        console.log('[NEW-SOURCES] Database connection successful');
        const existingUrls = await getExistingArticleUrls();
        console.log(`[NEW-SOURCES] Found ${existingUrls.size} existing articles in database`);
        let allArticles = [];
        // Scrape new sources
        const newSources = [
            { name: 'TripAdvisor', scraper: scrapeTripAdvisor, enabled: true },
            { name: 'Booking.com', scraper: scrapeBooking, enabled: true },
            { name: 'Reddit', scraper: scrapeReddit, enabled: true },
            { name: 'Quora', scraper: scrapeQuora, enabled: true },
        ];
        for (const source of newSources) {
            if (source.enabled) {
                console.log(`\n[NEW-SOURCES] Starting ${source.name} scraping...`);
                try {
                    const articles = await source.scraper();
                    allArticles = allArticles.concat(articles);
                }
                catch (e) {
                    console.error(`[NEW-SOURCES] ${source.name} scraping failed:`, e);
                }
            }
        }
        console.log(`\n[NEW-SOURCES] Found a total of ${allArticles.length} articles from new sources.`);
        const newArticles = allArticles.filter(article => !existingUrls.has(article.url));
        console.log(`[NEW-SOURCES] ${newArticles.length} are new articles not yet in the database.`);
        let processedCount = 0, errorCount = 0;
        for (const article of newArticles) {
            try {
                const contentHash = (0, contentDeduplication_1.generateContentHash)(article.answer);
                let isDuplicate = false;
                if (contentHash) {
                    const duplicateCheck = await (0, contentDeduplication_1.checkContentDuplicate)(contentHash);
                    if (duplicateCheck.isDuplicate) {
                        console.log(`[NEW-SOURCES][DEDUP] Found content duplicate of ${duplicateCheck.existingArticle?.url}.`);
                        isDuplicate = true;
                    }
                }
                const languageDetection = (0, languageDetection_1.detectLanguage)(article.answer);
                const slug = await generateUniqueSlug(article.question);
                let paragraphsWithEmbeddings = [];
                try {
                    paragraphsWithEmbeddings = await (0, openai_1.getContentEmbeddings)(article.answer);
                }
                catch (embeddingError) {
                    console.error('[NEW-SOURCES] Failed to generate embeddings:', embeddingError);
                }
                const created = await prisma.article.create({
                    data: {
                        url: article.url,
                        question: article.question,
                        slug: slug,
                        answer: article.answer,
                        category: article.category,
                        platform: article.platform,
                        contentType: article.contentType,
                        source: 'help_center',
                        contentHash: contentHash || null,
                        isDuplicate: isDuplicate,
                        language: languageDetection.language,
                    },
                });
                if (paragraphsWithEmbeddings.length > 0) {
                    await prisma.articleParagraph.createMany({
                        data: paragraphsWithEmbeddings.map(p => ({
                            articleId: created.id,
                            text: p.text,
                            embedding: p.embedding,
                        })),
                    });
                }
                processedCount++;
                console.log(`[NEW-SOURCES] Successfully processed article: ${article.question}`);
            }
            catch (articleError) {
                console.error(`[NEW-SOURCES] Error processing article "${article.question}" (${article.url}):`);
                console.error(articleError.message);
                errorCount++;
            }
        }
        console.log(`\n[NEW-SOURCES] Processing summary:`);
        console.log(`[NEW-SOURCES] - New articles processed: ${processedCount}`);
        console.log(`[NEW-SOURCES] - Articles with errors: ${errorCount}`);
        console.log(`[NEW-SOURCES] - Total new articles attempted: ${newArticles.length}`);
        console.log('\n[NEW-SOURCES] New sources scraping process completed successfully');
    }
    catch (error) {
        console.error('[NEW-SOURCES] Error during new sources scraping:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
        console.log('[NEW-SOURCES] Database connection closed');
    }
}
main();
//# sourceMappingURL=new-sources.js.map