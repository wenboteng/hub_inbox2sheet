#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeAirbnbCommunity = scrapeAirbnbCommunity;
const client_1 = require("@prisma/client");
const openai_1 = require("../src/utils/openai");
const languageDetection_1 = require("../src/utils/languageDetection");
const slugify_1 = require("../src/utils/slugify");
const puppeteer_1 = require("../src/utils/puppeteer");
const parseHelpers_1 = require("../src/utils/parseHelpers");
const prisma = new client_1.PrismaClient();
async function extractCommunityContent(page, url) {
    try {
        console.log(`[AIRBNB-COMMUNITY] Extracting content from ${url}`);
        // Extract thread title
        const title = await page.evaluate(() => {
            const element = document.querySelector('.lia-message-subject, .page-title, .topic-title, h1');
            return element ? element.textContent?.trim() || '' : '';
        });
        // Extract thread content
        const content = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('.lia-message-body-content, .lia-message-body'));
            return elements.map(el => el.textContent?.trim() || '').join('\n');
        });
        // Extract category from URL
        const category = extractCategoryFromUrl(url);
        if (!title || !content) {
            console.log(`[AIRBNB-COMMUNITY] Warning: Missing content for thread ${url}`);
            return null;
        }
        const cleanedContent = (0, parseHelpers_1.cleanText)(content);
        const languageDetection = (0, languageDetection_1.detectLanguage)(cleanedContent);
        // Only process English content
        if (languageDetection.language !== 'en') {
            console.log(`[AIRBNB-COMMUNITY] Skipping non-English content (${languageDetection.language}): ${url}`);
            return null;
        }
        return {
            title: (0, parseHelpers_1.cleanText)(title),
            content: cleanedContent,
            category: category || 'Airbnb Community',
        };
    }
    catch (error) {
        console.error(`[AIRBNB-COMMUNITY] Error extracting content from ${url}:`, error);
        return null;
    }
}
function extractCategoryFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        for (let i = 0; i < pathParts.length; i++) {
            if (pathParts[i] === 't5' && pathParts[i + 1]) {
                return pathParts[i + 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        }
    }
    catch (error) {
        console.error(`[AIRBNB-COMMUNITY] Error extracting category from URL: ${url}`, error);
    }
    return 'Airbnb Community';
}
async function saveToDatabase(articles) {
    console.log(`[AIRBNB-COMMUNITY] Saving ${articles.length} articles to database...`);
    for (const article of articles) {
        try {
            // Check if article already exists
            const existing = await prisma.article.findUnique({ where: { url: article.url } });
            if (existing) {
                console.log(`[AIRBNB-COMMUNITY] Article already exists: ${article.url}`);
                continue;
            }
            // Generate unique slug
            let uniqueSlug = (0, slugify_1.slugify)(article.question);
            let counter = 1;
            while (await prisma.article.findUnique({ where: { slug: uniqueSlug } })) {
                uniqueSlug = `${(0, slugify_1.slugify)(article.question)}-${counter}`;
                counter++;
            }
            // Detect language
            const languageDetection = (0, languageDetection_1.detectLanguage)(article.answer);
            // Generate embeddings
            const paragraphs = article.answer.split('\n\n').filter(p => p.trim().length > 50);
            const paragraphsWithEmbeddings = [];
            for (const paragraph of paragraphs.slice(0, 5)) {
                try {
                    const embedding = await (0, openai_1.getEmbedding)(paragraph);
                    paragraphsWithEmbeddings.push({ text: paragraph, embedding });
                }
                catch (error) {
                    console.error(`[AIRBNB-COMMUNITY] Error generating embedding for paragraph:`, error);
                }
            }
            // Create article
            const created = await prisma.article.create({
                data: {
                    url: article.url,
                    question: article.question,
                    answer: article.answer,
                    slug: uniqueSlug,
                    category: article.category,
                    platform: article.platform,
                    contentType: 'community',
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
                        embedding: p.embedding, // Store as JSON
                    })),
                });
                console.log(`[AIRBNB-COMMUNITY] Created ${paragraphsWithEmbeddings.length} paragraph embeddings`);
            }
            console.log(`[AIRBNB-COMMUNITY] Saved article: ${article.url}`);
        }
        catch (error) {
            console.error(`[AIRBNB-COMMUNITY] Error saving article ${article.url}:`, error);
        }
    }
}
async function scrapeAirbnbCommunity() {
    console.log('[AIRBNB-COMMUNITY] Starting Airbnb Community scraping...');
    const articles = [];
    try {
        const browser = await (0, puppeteer_1.createBrowser)();
        console.log('[AIRBNB-COMMUNITY] Browser created successfully');
        try {
            const page = await browser.newPage();
            // Set a reasonable timeout and user agent
            await page.setDefaultTimeout(30000);
            await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            // Enable request interception to block non-essential resources
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                if (['image', 'font', 'media'].includes(request.resourceType())) {
                    request.abort();
                }
                else {
                    request.continue();
                }
            });
            // Start from the main community page
            try {
                console.log('[AIRBNB-COMMUNITY] Attempting to scrape from main community page...');
                await page.goto('https://community.withairbnb.com/t5/Community-Center/ct-p/community-center', { waitUntil: 'networkidle0', timeout: 30000 });
                // Debug: Check if we can access the page
                const pageTitle = await page.title();
                console.log(`[AIRBNB-COMMUNITY] Page title: "${pageTitle}"`);
                // Get all thread links
                const threadLinks = await page.$$eval('a[href*="/td-p/"], a[href*="/m-p/"]', links => links.map(link => ({
                    url: link.href,
                    title: link.textContent?.trim() || '',
                })));
                console.log(`[AIRBNB-COMMUNITY] Found ${threadLinks.length} thread links from main page`);
                // Process each thread (limit for production safety)
                for (const { url, title } of threadLinks.slice(0, 20)) {
                    try {
                        console.log(`[AIRBNB-COMMUNITY] Scraping thread: ${title} (${url})`);
                        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
                        const extracted = await extractCommunityContent(page, url);
                        if (extracted) {
                            articles.push({
                                url,
                                question: extracted.title || title,
                                answer: extracted.content,
                                platform: 'Airbnb',
                                category: extracted.category,
                            });
                            console.log(`[AIRBNB-COMMUNITY] Successfully scraped thread: ${extracted.title}`);
                        }
                        else {
                            console.log(`[AIRBNB-COMMUNITY] Skipping thread with insufficient content: ${title}`);
                        }
                    }
                    catch (error) {
                        console.error(`[AIRBNB-COMMUNITY] Error scraping thread ${url}:`, error);
                    }
                    // Add delay between requests
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            catch (error) {
                console.error('[AIRBNB-COMMUNITY] Error accessing main community page:', error);
            }
        }
        finally {
            await browser.close();
            console.log('[AIRBNB-COMMUNITY] Browser closed');
        }
    }
    catch (error) {
        console.error('[AIRBNB-COMMUNITY] Failed to create browser:', error);
        throw error;
    }
    console.log(`[AIRBNB-COMMUNITY] Scraping completed. Found ${articles.length} articles`);
    // Validate articles before returning
    const validArticles = articles.filter(article => {
        const isValid = article.question && article.question.trim() !== '' &&
            article.answer && article.answer.length > 50;
        if (!isValid) {
            console.log(`[AIRBNB-COMMUNITY] Invalid article filtered out: ${article.url}`);
        }
        return isValid;
    });
    console.log(`[AIRBNB-COMMUNITY] Valid articles: ${validArticles.length} (${articles.length - validArticles.length} invalid)`);
    return validArticles;
}
// Main execution function
async function runStandaloneCrawl() {
    console.log('🚀 Starting AIRBNB COMMUNITY CRAWLER (Cron Job #2)');
    console.log('==================================================');
    console.log('📋 Job Type: Airbnb Community Forum Crawler');
    console.log('⏰ Schedule: Daily at 4am UTC');
    console.log('🎯 Target: community.withairbnb.com');
    console.log('📊 Content Type: Community forum threads and replies');
    console.log('==================================================');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🖥️  Platform: ${process.platform}`);
    console.log(`📦 Node.js version: ${process.version}`);
    console.log(`🔧 Job ID: AIRBNB-COMMUNITY-${Date.now()}`);
    try {
        const startTime = Date.now();
        // Test Puppeteer setup first
        console.log('\n🧪 Testing Puppeteer setup...');
        try {
            const browser = await (0, puppeteer_1.createBrowser)();
            const page = await browser.newPage();
            await page.goto('https://example.com', { waitUntil: 'networkidle0', timeout: 10000 });
            const title = await page.title();
            console.log(`✅ Puppeteer test successful - Page title: "${title}"`);
            await page.close();
            await browser.close();
        }
        catch (puppeteerError) {
            console.error('❌ Puppeteer test failed:', puppeteerError);
            console.error('This indicates a Chrome/Puppeteer setup issue in the production environment.');
            console.error('Please check the Chrome installation and cache directory configuration.');
            process.exit(1);
        }
        // Run the scraper using the same pattern as the working Airbnb scraper
        console.log('\n🕷️  Starting content scraping...');
        const articles = await scrapeAirbnbCommunity();
        // Save to database
        if (articles.length > 0) {
            console.log('\n💾 Saving articles to database...');
            await saveToDatabase(articles);
        }
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        console.log('\n✅ AIRBNB COMMUNITY CRAWLER Completed!');
        console.log('========================================');
        console.log(`⏱️  Duration: ${duration} seconds (${Math.round(duration / 60)} minutes)`);
        console.log(`📝 Articles extracted: ${articles.length}`);
        console.log(`🎯 Job Type: Community Forum Crawler`);
        // Success/failure determination
        if (articles.length > 0) {
            console.log('\n✅ CRAWL SUCCESSFUL - Community content was extracted and saved to database');
            process.exit(0);
        }
        else {
            console.log('\n⚠️  CRAWL WARNING - No community content was extracted. Check site structure.');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('\n❌ AIRBNB COMMUNITY CRAWLER failed:', error);
        console.error('\n🔍 Debug information:');
        console.error(`- Job Type: Community Forum Crawler`);
        console.error(`- Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
        console.error(`- Error message: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`- Error stack: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
        // Check if it's a Puppeteer-related error
        if (error instanceof Error && error.message && error.message.includes('Chrome')) {
            console.error('\n🚨 This appears to be a Chrome/Puppeteer setup issue.');
            console.error('Common solutions:');
            console.error('1. Ensure Chrome is properly installed');
            console.error('2. Check cache directory permissions');
            console.error('3. Verify Puppeteer version compatibility');
        }
        process.exit(1);
    }
}
// Run the standalone crawl
runStandaloneCrawl()
    .catch((error) => {
    console.error('💥 Standalone crawl crashed:', error);
    process.exit(1);
});
//# sourceMappingURL=airbnb-community-crawler.js.map