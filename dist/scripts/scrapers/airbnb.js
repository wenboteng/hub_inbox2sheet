"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeAirbnb = scrapeAirbnb;
const puppeteer_1 = require("../../utils/puppeteer");
const parseHelpers_1 = require("../../utils/parseHelpers");
// List of known Airbnb help articles to scrape
const AIRBNB_ARTICLES = [
    'https://www.airbnb.com/help/article/2503',
    'https://www.airbnb.com/help/article/2894',
    'https://www.airbnb.com/help/article/2908',
    'https://www.airbnb.com/help/article/2799',
    'https://www.airbnb.com/help/article/2701',
    'https://www.airbnb.com/help/article/3113', // Getting started on Airbnb
];
async function extractArticleContent(page, url) {
    try {
        // Wait for h1 title first
        await page.waitForSelector('h1', { timeout: 10000 });
        const title = await page.$eval('h1', el => el.textContent?.trim() || '');
        // Try multiple content selectors in order of preference
        const contentSelectors = [
            'div[data-testid="CEPHtmlSection"]', // Airbnb's current main content selector
            'article',
            '.article-content',
            '.help-content',
            'main',
            '.content',
            '[role="main"]',
            '.article-body',
            '.help-article-content'
        ];
        let content = '';
        let usedSelector = '';
        for (const selector of contentSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 5000 });
                const extractedContent = await page.$eval(selector, el => el.textContent?.trim() || '');
                if (extractedContent && extractedContent.length > 50) {
                    content = extractedContent;
                    usedSelector = selector;
                    console.log(`[AIRBNB] Found content using selector: ${selector}`);
                    break;
                }
            }
            catch (e) {
                console.log(`[AIRBNB] Selector ${selector} not found, trying next...`);
            }
        }
        // If no content found with specific selectors, try body as fallback
        if (!content || content.length < 50) {
            content = await page.$eval('body', el => el.textContent?.trim() || '');
            usedSelector = 'body (fallback)';
            console.log(`[AIRBNB] Using body fallback for content`);
        }
        // Get category from breadcrumb or default
        let category = 'Help Center';
        try {
            category = await page.$eval('.breadcrumb, .breadcrumbs, nav[aria-label="breadcrumb"]', el => el.textContent?.split('>').pop()?.trim() || 'Help Center');
        }
        catch (e) {
            console.log('[AIRBNB] Could not extract category, using default');
        }
        if (content && content.length > 50) {
            return {
                title: (0, parseHelpers_1.cleanText)(title),
                content: (0, parseHelpers_1.cleanText)(content),
                category
            };
        }
        else {
            console.log(`[AIRBNB] Insufficient content found for ${url}`);
            return null;
        }
    }
    catch (error) {
        console.error(`[AIRBNB] Error extracting content from ${url}:`, error);
        return null;
    }
}
async function scrapeAirbnb() {
    console.log('[AIRBNB] Starting Airbnb scraping...');
    const articles = [];
    try {
        const browser = await (0, puppeteer_1.createBrowser)();
        console.log('[AIRBNB] Browser created successfully');
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
            // Try to scrape from the main help center first
            try {
                console.log('[AIRBNB] Attempting to scrape from main help center...');
                await page.goto('https://www.airbnb.com/help', { waitUntil: 'networkidle0', timeout: 30000 });
                // Get all article links
                const articleLinks = await page.$$eval('a[href*="/help/article/"]', links => links.map(link => ({
                    url: link.href,
                    title: link.textContent?.trim() || '',
                })));
                console.log(`[AIRBNB] Found ${articleLinks.length} article links`);
                // Process each article (limit to first 5 for testing)
                for (const { url, title } of articleLinks.slice(0, 5)) {
                    try {
                        console.log(`[AIRBNB] Scraping article: ${title}`);
                        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
                        const extracted = await extractArticleContent(page, url);
                        if (extracted) {
                            articles.push({
                                url,
                                question: extracted.title || title,
                                answer: extracted.content,
                                platform: 'Airbnb',
                                category: extracted.category,
                            });
                            console.log(`[AIRBNB] Successfully scraped article: ${extracted.title}`);
                        }
                        else {
                            console.log(`[AIRBNB] Skipping article with insufficient content: ${title}`);
                        }
                    }
                    catch (error) {
                        console.error(`[AIRBNB] Error scraping article ${url}:`, error);
                    }
                    // Add delay between requests
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            catch (error) {
                console.error('[AIRBNB] Error accessing main help center:', error);
            }
            // If no articles found, try scraping some known articles
            if (articles.length === 0) {
                console.log('[AIRBNB] No articles found from main page, trying known articles...');
                for (const url of AIRBNB_ARTICLES.slice(0, 3)) {
                    try {
                        console.log(`[AIRBNB] Trying known article: ${url}`);
                        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
                        const extracted = await extractArticleContent(page, url);
                        if (extracted) {
                            articles.push({
                                url,
                                question: extracted.title || 'Airbnb Help Article',
                                answer: extracted.content,
                                platform: 'Airbnb',
                                category: extracted.category,
                            });
                            console.log(`[AIRBNB] Successfully scraped known article: ${extracted.title}`);
                        }
                    }
                    catch (error) {
                        console.error(`[AIRBNB] Error scraping known article ${url}:`, error);
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        finally {
            await browser.close();
            console.log('[AIRBNB] Browser closed');
        }
    }
    catch (error) {
        console.error('[AIRBNB] Failed to create browser:', error);
        throw error; // Re-throw to let the main script handle it
    }
    console.log(`[AIRBNB] Scraping completed. Found ${articles.length} articles`);
    return articles;
}
