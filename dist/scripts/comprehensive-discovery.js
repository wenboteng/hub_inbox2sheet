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
const airbnb_1 = require("../scripts/scrapers/airbnb");
const getyourguide_1 = require("../crawlers/getyourguide");
const viator_1 = require("../crawlers/viator");
const contentDeduplication_1 = require("../utils/contentDeduplication");
const featureFlags_1 = require("../utils/featureFlags");
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
// Deep scraping of Airbnb with pagination and new article discovery
async function deepScrapeAirbnb() {
    console.log('[DEEP-SCRAPE] Starting deep Airbnb scraping...');
    const articles = [];
    try {
        const { createBrowser } = await Promise.resolve().then(() => __importStar(require('../utils/puppeteer')));
        const browser = await createBrowser();
        try {
            const page = await browser.newPage();
            await setupPage(page);
            // Extended list of Airbnb help pages with pagination
            const helpPages = [
                'https://www.airbnb.com/help',
                'https://www.airbnb.com/help/article/2855',
                'https://www.airbnb.com/help/article/2856',
                'https://www.airbnb.com/help/article/2857',
                'https://www.airbnb.com/help/article/2858',
                'https://www.airbnb.com/help/article/2859',
                'https://www.airbnb.com/help/article/2860',
                'https://www.airbnb.com/help/article/2861',
                'https://www.airbnb.com/help/article/2862',
                'https://www.airbnb.com/help/article/2863',
                'https://www.airbnb.com/help/article/2864',
                'https://www.airbnb.com/help/article/2865',
                'https://www.airbnb.com/help/article/2866',
                'https://www.airbnb.com/help/article/2867',
                'https://www.airbnb.com/help/article/2868',
                'https://www.airbnb.com/help/article/2869',
                'https://www.airbnb.com/help/article/2870',
                'https://www.airbnb.com/help/article/2871',
                'https://www.airbnb.com/help/article/2872',
                'https://www.airbnb.com/help/article/2873',
                'https://www.airbnb.com/help/article/2874',
                'https://www.airbnb.com/help/article/2875',
                'https://www.airbnb.com/help/article/2876',
                'https://www.airbnb.com/help/article/2877',
                'https://www.airbnb.com/help/article/2878',
                'https://www.airbnb.com/help/article/2879',
                'https://www.airbnb.com/help/article/2880',
                'https://www.airbnb.com/help/article/2881',
                'https://www.airbnb.com/help/article/2882',
                'https://www.airbnb.com/help/article/2883',
                'https://www.airbnb.com/help/article/2884',
                'https://www.airbnb.com/help/article/2885',
                'https://www.airbnb.com/help/article/2886',
                'https://www.airbnb.com/help/article/2887',
                'https://www.airbnb.com/help/article/2888',
                'https://www.airbnb.com/help/article/2889',
                'https://www.airbnb.com/help/article/2890',
                'https://www.airbnb.com/help/article/2891',
                'https://www.airbnb.com/help/article/2892',
                'https://www.airbnb.com/help/article/2893',
                'https://www.airbnb.com/help/article/2894',
                'https://www.airbnb.com/help/article/2895',
                'https://www.airbnb.com/help/article/2896',
                'https://www.airbnb.com/help/article/2897',
                'https://www.airbnb.com/help/article/2898',
                'https://www.airbnb.com/help/article/2899',
                'https://www.airbnb.com/help/article/2900',
            ];
            for (const helpPage of helpPages) {
                try {
                    console.log(`[DEEP-SCRAPE] Scraping ${helpPage}...`);
                    await page.goto(helpPage, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    // Extract all article links
                    const articleLinks = await page.$$eval('a[href*="/help/article/"]', (links) => links.map((link) => link.href));
                    console.log(`[DEEP-SCRAPE] Found ${articleLinks.length} article links on ${helpPage}`);
                    // Scrape each article
                    for (const articleUrl of articleLinks.slice(0, 15)) { // Increased limit
                        try {
                            await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                            const articleData = await page.evaluate(() => {
                                const title = document.querySelector('h1, .title, .article-title')?.textContent?.trim() || '';
                                const content = document.querySelector('.article-content, .content, .body')?.textContent?.trim() || '';
                                return { title, content };
                            });
                            if (articleData.title && articleData.content && articleData.content.length > 100) {
                                articles.push({
                                    url: articleUrl,
                                    question: articleData.title,
                                    answer: articleData.content,
                                    platform: 'Airbnb',
                                    category: 'Help Center',
                                    contentType: 'official'
                                });
                                console.log(`[DEEP-SCRAPE] Scraped: ${articleData.title}`);
                            }
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                        catch (error) {
                            console.error(`[DEEP-SCRAPE] Error scraping article ${articleUrl}:`, error);
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                catch (error) {
                    console.error(`[DEEP-SCRAPE] Error scraping help page ${helpPage}:`, error);
                }
            }
            await page.close();
        }
        finally {
            await browser.close();
        }
    }
    catch (error) {
        console.error('[DEEP-SCRAPE] Failed to create browser:', error);
    }
    console.log(`[DEEP-SCRAPE] Deep Airbnb scraping completed. Found ${articles.length} articles`);
    return articles;
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
                'https://tripadvisor.mediasoup.com/help/account',
                'https://tripadvisor.mediasoup.com/help/technical',
                'https://tripadvisor.mediasoup.com/help/security',
                'https://tripadvisor.mediasoup.com/help/privacy',
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
                'https://www.booking.com/content/help/account.html',
                'https://www.booking.com/content/help/technical.html',
                'https://www.booking.com/content/help/security.html',
                'https://www.booking.com/content/help/privacy.html',
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
                'https://www.reddit.com/r/travelhacks/',
                'https://www.reddit.com/r/budgettravel/',
                'https://www.reddit.com/r/airbnb/',
            ];
            for (const redditUrl of redditUrls) {
                try {
                    console.log(`[NEW-SOURCES] Scraping ${redditUrl}...`);
                    await page.goto(redditUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    // Extract top posts
                    const posts = await page.$$eval('h3, .title, [data-testid="post-title"]', (elements) => elements.slice(0, 15).map((el) => ({
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
                'https://www.quora.com/topic/Airbnb',
                'https://www.quora.com/topic/Travel-Tips',
                'https://www.quora.com/topic/Travel-Planning',
            ];
            for (const quoraUrl of quoraUrls) {
                try {
                    console.log(`[NEW-SOURCES] Scraping ${quoraUrl}...`);
                    await page.goto(quoraUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    // Extract questions
                    const questions = await page.$$eval('a[href*="/topic/"]', (links) => links.slice(0, 15).map((link) => ({
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
        console.log('[COMPREHENSIVE-DISCOVERY] Starting comprehensive discovery process...');
        await prisma.$connect();
        console.log('[COMPREHENSIVE-DISCOVERY] Database connection successful');
        const existingUrls = await getExistingArticleUrls();
        console.log(`[COMPREHENSIVE-DISCOVERY] Found ${existingUrls.size} existing articles in database`);
        let allArticles = [];
        // Deep scraping of existing platforms
        console.log('\n[COMPREHENSIVE-DISCOVERY] === DEEP CONTENT DISCOVERY ===');
        try {
            const deepAirbnbArticles = await deepScrapeAirbnb();
            allArticles = allArticles.concat(deepAirbnbArticles);
        }
        catch (e) {
            console.error('[COMPREHENSIVE-DISCOVERY] Deep Airbnb scraping failed:', e);
        }
        // Regular scrapers with enhanced pagination
        const existingScrapers = [
            { name: 'Airbnb', scraper: airbnb_1.scrapeAirbnb, enabled: true },
            { name: 'GetYourGuide', scraper: getyourguide_1.crawlGetYourGuideArticlesWithPagination, enabled: (0, featureFlags_1.isFeatureEnabled)('enableGetYourGuidePagination') },
            { name: 'Viator', scraper: viator_1.crawlViatorArticles, enabled: (0, featureFlags_1.isFeatureEnabled)('enableViatorScraping') },
        ];
        for (const scraper of existingScrapers) {
            if (scraper.enabled) {
                console.log(`\n[COMPREHENSIVE-DISCOVERY] Starting ${scraper.name} scraping...`);
                try {
                    const articles = await scraper.scraper();
                    const mappedArticles = articles.map((a) => ({
                        ...a,
                        platform: scraper.name,
                        contentType: 'official',
                        category: a.category || 'Help Center',
                    }));
                    allArticles = allArticles.concat(mappedArticles);
                }
                catch (e) {
                    console.error(`[COMPREHENSIVE-DISCOVERY] ${scraper.name} scraping failed:`, e);
                }
            }
        }
        // New content sources
        console.log('\n[COMPREHENSIVE-DISCOVERY] === NEW CONTENT SOURCES ===');
        const newSources = [
            { name: 'TripAdvisor', scraper: scrapeTripAdvisor, enabled: true },
            { name: 'Booking.com', scraper: scrapeBooking, enabled: true },
            { name: 'Reddit', scraper: scrapeReddit, enabled: true },
            { name: 'Quora', scraper: scrapeQuora, enabled: true },
        ];
        for (const source of newSources) {
            if (source.enabled) {
                console.log(`\n[COMPREHENSIVE-DISCOVERY] Starting ${source.name} scraping...`);
                try {
                    const articles = await source.scraper();
                    allArticles = allArticles.concat(articles);
                }
                catch (e) {
                    console.error(`[COMPREHENSIVE-DISCOVERY] ${source.name} scraping failed:`, e);
                }
            }
        }
        console.log(`\n[COMPREHENSIVE-DISCOVERY] Found a total of ${allArticles.length} articles from all sources.`);
        const newArticles = allArticles.filter(article => !existingUrls.has(article.url));
        console.log(`[COMPREHENSIVE-DISCOVERY] ${newArticles.length} are new articles not yet in the database.`);
        let processedCount = 0, errorCount = 0;
        for (const article of newArticles) {
            try {
                const contentHash = (0, contentDeduplication_1.generateContentHash)(article.answer);
                let isDuplicate = false;
                if (contentHash) {
                    const duplicateCheck = await (0, contentDeduplication_1.checkContentDuplicate)(contentHash);
                    if (duplicateCheck.isDuplicate) {
                        console.log(`[COMPREHENSIVE-DISCOVERY][DEDUP] Found content duplicate of ${duplicateCheck.existingArticle?.url}.`);
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
                    console.error('[COMPREHENSIVE-DISCOVERY] Failed to generate embeddings:', embeddingError);
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
                console.log(`[COMPREHENSIVE-DISCOVERY] Successfully processed article: ${article.question}`);
            }
            catch (articleError) {
                console.error(`[COMPREHENSIVE-DISCOVERY] Error processing article "${article.question}" (${article.url}):`);
                console.error(articleError.message);
                errorCount++;
            }
        }
        console.log(`\n[COMPREHENSIVE-DISCOVERY] Processing summary:`);
        console.log(`[COMPREHENSIVE-DISCOVERY] - New articles processed: ${processedCount}`);
        console.log(`[COMPREHENSIVE-DISCOVERY] - Articles with errors: ${errorCount}`);
        console.log(`[COMPREHENSIVE-DISCOVERY] - Total new articles attempted: ${newArticles.length}`);
        console.log('\n[COMPREHENSIVE-DISCOVERY] Comprehensive discovery process completed successfully');
    }
    catch (error) {
        console.error('[COMPREHENSIVE-DISCOVERY] Error during comprehensive discovery:', error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
        console.log('[COMPREHENSIVE-DISCOVERY] Database connection closed');
    }
}
main();
//# sourceMappingURL=comprehensive-discovery.js.map