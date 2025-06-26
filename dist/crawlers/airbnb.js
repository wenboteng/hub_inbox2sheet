"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlAirbnbArticle = crawlAirbnbArticle;
exports.crawlAirbnbArticles = crawlAirbnbArticles;
const puppeteer_1 = __importDefault(require("puppeteer"));
const parseHelpers_1 = require("../utils/parseHelpers");
const BASE_URL = 'https://www.airbnb.com/help';
const AIRBNB_SELECTORS = {
    title: 'h1',
    content: 'div[data-testid="CEPHtmlSection"]',
    categoryLinks: 'a[href*="/help/topic/"]',
    articleLinks: 'a[href*="/help/article/"]',
};
// Initial set of verified article URLs
const VERIFIED_URLS = [
    'https://www.airbnb.com/help/article/2503',
    'https://www.airbnb.com/help/article/2894',
    'https://www.airbnb.com/help/article/2908',
    'https://www.airbnb.com/help/article/2799',
    'https://www.airbnb.com/help/article/2701',
];
async function crawlAirbnbArticle(url, browser) {
    console.log(`[AIRBNB] Crawling ${url}`);
    try {
        const page = await browser.newPage();
        // Set viewport and user agent
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        // Set language to English
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9'
        });
        // Enable request interception
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            // Block images, fonts, and other non-essential resources
            if (['image', 'font', 'media'].includes(request.resourceType())) {
                request.abort();
            }
            else {
                request.continue();
            }
        });
        // Navigate to the URL and wait for content to load
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        // Wait for the h1 title to be present
        await page.waitForSelector('h1', { timeout: 10000 });
        // Get page HTML for debugging
        const html = await page.content();
        console.log(`[AIRBNB] Page HTML preview:`, html.slice(0, 500));
        // Debug: Log all h1 elements
        const h1Elements = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('h1'));
            return elements.map(el => ({
                text: el.textContent?.trim(),
                className: el.className,
                id: el.id
            }));
        });
        console.log(`[AIRBNB] Found h1 elements:`, h1Elements);
        // Debug: Log all div elements with data-testid
        const testIdElements = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('[data-testid]'));
            return elements.map(el => ({
                testId: el.getAttribute('data-testid'),
                tagName: el.tagName,
                className: el.className
            }));
        });
        console.log(`[AIRBNB] Found elements with data-testid:`, testIdElements);
        // Extract title and content
        const title = await page.evaluate((selectors) => {
            const element = document.querySelector(selectors.title);
            return element ? element.textContent?.trim() || '' : '';
        }, AIRBNB_SELECTORS);
        const content = await page.evaluate((selectors) => {
            const elements = Array.from(document.querySelectorAll(selectors.content));
            return elements.map(el => el.innerHTML).join('\n');
        }, AIRBNB_SELECTORS);
        const rawHtml = await page.content();
        await page.close();
        if (!title || !content) {
            console.log(`[AIRBNB] Warning: Missing content for ${url}`);
            console.log(`[AIRBNB] Title found: ${title ? 'Yes' : 'No'}`);
            console.log(`[AIRBNB] Content length: ${content.length}`);
            return null;
        }
        const cleanedContent = (0, parseHelpers_1.cleanText)(content);
        // Preview the content
        console.log(`[AIRBNB][SUCCESS] Found content:`);
        console.log(`[AIRBNB][SUCCESS] Title: ${title}`);
        console.log(`[AIRBNB][SUCCESS] Content preview: ${cleanedContent.slice(0, 100)}...`);
        return {
            platform: 'Airbnb',
            url,
            question: title,
            answer: cleanedContent,
            rawHtml,
        };
    }
    catch (error) {
        console.error(`[AIRBNB] Failed to crawl ${url}:`, error);
        return null;
    }
}
async function crawlAirbnbArticles() {
    console.log('[AIRBNB] Starting crawl of Airbnb help center articles');
    const results = [];
    const processedUrls = new Set();
    // Launch browser
    const browser = await puppeteer_1.default.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1280,800'
        ]
    });
    try {
        // Crawl verified article URLs first
        for (const url of VERIFIED_URLS) {
            if (processedUrls.has(url)) {
                continue;
            }
            try {
                const article = await crawlAirbnbArticle(url, browser);
                if (article) {
                    results.push(article);
                    processedUrls.add(url);
                }
                // Add a small delay between requests to be polite
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            catch (error) {
                console.error(`[AIRBNB] Failed to crawl ${url}:`, error);
            }
        }
    }
    finally {
        await browser.close();
    }
    console.log(`[AIRBNB] Successfully crawled ${results.length} articles`);
    return results;
}
//# sourceMappingURL=airbnb.js.map