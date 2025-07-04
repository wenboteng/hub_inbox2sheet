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
exports.scrapeAirbnbCommunity = scrapeAirbnbCommunity;
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const openai_1 = require("../src/utils/openai");
const languageDetection_1 = require("../src/utils/languageDetection");
const slugify_1 = require("../src/utils/slugify");
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
// Function to log scraping statistics
async function logScrapingStats() {
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
// Dynamic URL discovery function
async function discoverNewUrls() {
    console.log('[DISCOVERY] Starting dynamic URL discovery...');
    const discoveredUrls = new Set();
    // Add more sources to discover URLs from
    const discoverySources = [
        'https://www.airbnb.com/help',
        'https://supply.getyourguide.support/hc/en-us',
        'https://www.viator.com/help/',
        'https://www.expedia.com/help',
        'https://www.booking.com/content/help.html',
        'https://community.withairbnb.com',
        'https://www.reddit.com/r/AirBnB/',
        'https://www.reddit.com/r/travel/',
        'https://www.quora.com/topic/Airbnb',
        'https://www.quora.com/topic/Travel',
    ];
    for (const source of discoverySources) {
        try {
            console.log(`[DISCOVERY] Exploring ${source}...`);
            const response = await fetch(source, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
                signal: AbortSignal.timeout(10000)
            });
            if (response.ok) {
                const html = await response.text();
                const urlRegex = /href=["']([^"']+)["']/g;
                let match;
                while ((match = urlRegex.exec(html)) !== null) {
                    const href = match[1];
                    if (href && href.includes('help') && href.includes('article')) {
                        const fullUrl = href.startsWith('http') ? href : new URL(href, source).toString();
                        discoveredUrls.add(fullUrl);
                    }
                }
            }
        }
        catch (error) {
            console.log(`[DISCOVERY] Error exploring ${source}:`, error);
        }
    }
    console.log(`[DISCOVERY] Discovered ${discoveredUrls.size} potential URLs`);
    return Array.from(discoveredUrls);
}
// Comprehensive Airbnb Community scraping function
async function scrapeAirbnbCommunity() {
    console.log('[SCRAPE][AIRBNB-COMMUNITY] Starting comprehensive Airbnb Community scraping...');
    const articles = [];
    const processedUrls = new Set(); // Track processed URLs to avoid duplicates
    try {
        const { createBrowser } = await Promise.resolve().then(() => __importStar(require('../src/utils/puppeteer')));
        const browser = await createBrowser();
        console.log('[SCRAPE][AIRBNB-COMMUNITY] Browser created successfully');
        try {
            const communityCategories = [
                'https://community.withairbnb.com/t5/Community-Center/ct-p/community-center',
                'https://community.withairbnb.com/t5/Hosting/ct-p/hosting',
                'https://community.withairbnb.com/t5/Guests/ct-p/guests',
                'https://community.withairbnb.com/t5/Experiences/ct-p/experiences',
            ];
            console.log(`[SCRAPE][AIRBNB-COMMUNITY] Will scrape ${communityCategories.length} categories.`);
            // Login if credentials are available
            const username = process.env.AIRBNB_USERNAME;
            const password = process.env.AIRBNB_PASSWORD;
            if (username && password) {
                let loginPage;
                try {
                    loginPage = await browser.newPage();
                    console.log('[SCRAPE][AIRBNB-COMMUNITY] Navigating to Airbnb login page...');
                    await loginPage.goto('https://www.airbnb.com/login', { waitUntil: 'networkidle0' });
                    console.log('[SCRAPE][AIRBNB-COMMUNITY] Entering credentials...');
                    await loginPage.type('input[name="email"]', username);
                    await loginPage.click('button[type="submit"]');
                    await loginPage.waitForNavigation({ waitUntil: 'networkidle0' });
                    console.log('[SCRAPE][AIRBNB-COMMUNITY] Entering password...');
                    await loginPage.type('input[name="password"]', password);
                    await loginPage.click('button[type="submit"]');
                    await loginPage.waitForNavigation({ waitUntil: 'networkidle0' });
                    console.log('[SCRAPE][AIRBNB-COMMUNITY] Login successful!');
                }
                catch (e) {
                    console.error('[SCRAPE][AIRBNB-COMMUNITY] Login failed. Continuing without authentication.', e);
                }
                finally {
                    if (loginPage) {
                        await loginPage.close();
                        console.log('[SCRAPE][AIRBNB-COMMUNITY] Login page closed.');
                    }
                }
            }
            else {
                console.log('[SCRAPE][AIRBNB-COMMUNITY] Credentials not found, skipping login.');
            }
            for (const categoryUrl of communityCategories) {
                let threadLinks = [];
                let categoryName = 'Airbnb Community';
                let categoryPage;
                try {
                    categoryPage = await browser.newPage();
                    await setupPage(categoryPage);
                    console.log(`[SCRAPE][AIRBNB-COMMUNITY] Scraping category: ${categoryUrl}`);
                    await categoryPage.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
                    // Wait for content to load
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                    // Extract category name from URL
                    const urlObj = new URL(categoryUrl);
                    const pathParts = urlObj.pathname.split('/');
                    for (let i = 0; i < pathParts.length; i++) {
                        if (pathParts[i] === 't5' && pathParts[i + 1]) {
                            categoryName = pathParts[i + 1].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                            break;
                        }
                    }
                    // Improved thread link extraction - look for actual discussion threads
                    threadLinks = await categoryPage.$$eval(
                    // More specific selectors to find actual discussion threads
                    '.lia-message-subject a[href*="/td-p/"], .lia-message-subject a[href*="/m-p/"], .message-subject a[href*="/td-p/"], .message-subject a[href*="/m-p/"]', (links) => links.map((link) => ({
                        url: link.href,
                        title: link.textContent?.trim() || ''
                    })));
                    // If no threads found with specific selectors, try a broader approach
                    if (threadLinks.length === 0) {
                        console.log(`[SCRAPE][AIRBNB-COMMUNITY] No threads found with specific selectors, trying broader approach...`);
                        threadLinks = await categoryPage.$$eval('a[href*="/td-p/"], a[href*="/m-p/"]', (links) => {
                            const threadLinks = [];
                            links.forEach((link) => {
                                const href = link.href;
                                const title = link.textContent?.trim() || '';
                                // Filter out navigation links and only include actual discussion threads
                                if (title &&
                                    title.length > 5 &&
                                    !title.includes('Community Center') &&
                                    !title.includes('Guidelines') &&
                                    !href.includes('/ct-p/') &&
                                    !href.includes('/browse/')) {
                                    threadLinks.push({ url: href, title });
                                }
                            });
                            return threadLinks;
                        });
                    }
                    if (threadLinks.length === 0) {
                        console.log(`[SCRAPE][AIRBNB-COMMUNITY] No thread links found on ${categoryUrl}. Page might be blocked or empty.`);
                    }
                }
                catch (error) {
                    console.error(`[SCRAPE][AIRBNB-COMMUNITY] Error accessing category ${categoryUrl}:`, error);
                }
                finally {
                    if (categoryPage) {
                        await categoryPage.close();
                        console.log(`[SCRAPE][AIRBNB-COMMUNITY] Page closed for category: ${categoryUrl}`);
                    }
                }
                console.log(`[SCRAPE][AIRBNB-COMMUNITY] Found ${threadLinks.length} threads in ${categoryName}`);
                for (const { url, title } of threadLinks) {
                    // Skip if we've already processed this URL
                    if (processedUrls.has(url)) {
                        console.log(`[SCRAPE][AIRBNB-COMMUNITY] Skipping already processed URL: ${url}`);
                        continue;
                    }
                    let page;
                    try {
                        page = await browser.newPage();
                        await setupPage(page);
                        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
                        // Wait longer for dynamic content to load
                        console.log(`[SCRAPE][AIRBNB-COMMUNITY] Waiting for dynamic content on ${url}...`);
                        await new Promise((resolve) => setTimeout(resolve, 10000));
                        // Scroll to trigger lazy loading
                        await page.evaluate(() => {
                            window.scrollTo(0, document.body.scrollHeight);
                        });
                        await new Promise((resolve) => setTimeout(resolve, 3000));
                        const extracted = await page.evaluate(() => {
                            const titleElement = document.querySelector('.lia-message-subject, .page-title, .topic-title, h1, .lia-message-subject-text');
                            const title = titleElement ? titleElement.textContent?.trim() || '' : '';
                            // Extract ALL messages with improved selectors
                            const messageSelectors = [
                                '.lia-message-body-content',
                                '.lia-message-body',
                                '.lia-message-content',
                                '.message-content'
                            ];
                            let allContent = '';
                            for (const selector of messageSelectors) {
                                const elements = document.querySelectorAll(selector);
                                elements.forEach((element) => {
                                    if (element && element.textContent?.trim()) {
                                        allContent += element.textContent.trim() + '\n\n';
                                    }
                                });
                            }
                            return { title, content: allContent.trim() };
                        });
                        if (extracted.title && extracted.content && extracted.content.length > 100) {
                            articles.push({
                                url,
                                question: extracted.title || title,
                                answer: extracted.content,
                                platform: 'Airbnb',
                                category: categoryName,
                                contentType: 'community'
                            });
                            processedUrls.add(url); // Mark as processed
                            console.log(`[SCRAPE][AIRBNB-COMMUNITY] Successfully scraped thread: ${extracted.title} (${extracted.content.length} chars)`);
                        }
                    }
                    catch (error) {
                        console.error(`[SCRAPE][AIRBNB-COMMUNITY] Error scraping thread ${url}:`, error);
                    }
                    finally {
                        if (page) {
                            await page.close();
                        }
                    }
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
        finally {
            await browser.close();
            console.log('[SCRAPE][AIRBNB-COMMUNITY] Browser closed');
        }
    }
    catch (error) {
        console.error('[SCRAPE][AIRBNB-COMMUNITY] Failed to create browser:', error);
        throw error;
    }
    console.log(`[SCRAPE][AIRBNB-COMMUNITY] Scraping completed. Found ${articles.length} unique articles`);
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
}
// Main scraping function
async function main() {
    console.log('[SCRAPE] Starting comprehensive scraping...');
    try {
        // Get existing URLs to avoid duplicates
        const existingUrls = await getExistingArticleUrls();
        console.log(`[SCRAPE] Found ${existingUrls.size} existing articles`);
        let allNewArticles = [];
        // 1. Scrape Airbnb Community (Community Data)
        console.log('[SCRAPE] ===== AIRBNB COMMUNITY SCRAPING =====');
        try {
            const communityArticles = await scrapeAirbnbCommunity();
            console.log(`[SCRAPE] Found ${communityArticles.length} community articles`);
            // Filter out existing articles
            const newCommunityArticles = communityArticles.filter(article => !existingUrls.has(article.url));
            console.log(`[SCRAPE] ${newCommunityArticles.length} new community articles`);
            allNewArticles = allNewArticles.concat(newCommunityArticles);
        }
        catch (error) {
            console.error('[SCRAPE] Airbnb Community scraping failed:', error);
        }
        // 2. Scrape Airbnb Help Center (Official Data)
        console.log('[SCRAPE] ===== AIRBNB HELP CENTER SCRAPING =====');
        try {
            const { scrapeAirbnb } = await Promise.resolve().then(() => __importStar(require('./scrapers/airbnb')));
            const helpArticles = await scrapeAirbnb();
            console.log(`[SCRAPE] Found ${helpArticles.length} help center articles`);
            // Filter out existing articles
            const newHelpArticles = helpArticles.filter(article => !existingUrls.has(article.url));
            console.log(`[SCRAPE] ${newHelpArticles.length} new help center articles`);
            allNewArticles = allNewArticles.concat(newHelpArticles);
        }
        catch (error) {
            console.error('[SCRAPE] Airbnb Help Center scraping failed:', error);
        }
        // 3. Scrape GetYourGuide (Official Data)
        console.log('[SCRAPE] ===== GETYOURGUIDE SCRAPING =====');
        try {
            const { crawlGetYourGuideArticlesWithPagination } = await Promise.resolve().then(() => __importStar(require('../crawlers/getyourguide')));
            const getyourguideArticles = await crawlGetYourGuideArticlesWithPagination();
            console.log(`[SCRAPE] Found ${getyourguideArticles.length} GetYourGuide articles`);
            // Filter out existing articles and map to Article type
            const newGetYourGuideArticles = getyourguideArticles
                .filter(article => !existingUrls.has(article.url))
                .map(article => ({
                ...article,
                contentType: 'official',
                category: article.category || 'Help Center'
            }));
            console.log(`[SCRAPE] ${newGetYourGuideArticles.length} new GetYourGuide articles`);
            allNewArticles = allNewArticles.concat(newGetYourGuideArticles);
        }
        catch (error) {
            console.error('[SCRAPE] GetYourGuide scraping failed:', error);
        }
        // 4. Scrape Viator (Official Data)
        console.log('[SCRAPE] ===== VIATOR SCRAPING =====');
        try {
            const { crawlViatorArticles } = await Promise.resolve().then(() => __importStar(require('../crawlers/viator')));
            const viatorArticles = await crawlViatorArticles();
            console.log(`[SCRAPE] Found ${viatorArticles.length} Viator articles`);
            // Filter out existing articles and map to Article type
            const newViatorArticles = viatorArticles
                .filter(article => !existingUrls.has(article.url))
                .map(article => ({
                ...article,
                contentType: 'official',
                category: 'Help Center'
            }));
            console.log(`[SCRAPE] ${newViatorArticles.length} new Viator articles`);
            allNewArticles = allNewArticles.concat(newViatorArticles);
        }
        catch (error) {
            console.error('[SCRAPE] Viator scraping failed:', error);
        }
        console.log(`[SCRAPE] Total new articles to save: ${allNewArticles.length}`);
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
                        console.error(`[SCRAPE] Error generating embedding for paragraph:`, error);
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
                    console.log(`[SCRAPE] Created ${paragraphsWithEmbeddings.length} paragraph embeddings`);
                }
                console.log(`[SCRAPE] Saved article: ${article.question}`);
            }
            catch (error) {
                console.error(`[SCRAPE] Error saving article ${article.url}:`, error);
            }
        }
        // Log final statistics
        await logScrapingStats();
    }
    catch (error) {
        console.error('[SCRAPE] Error in main scraping function:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
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
//# sourceMappingURL=scrape.js.map