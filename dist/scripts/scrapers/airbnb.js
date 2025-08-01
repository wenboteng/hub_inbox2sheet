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
        console.log(`[AIRBNB] Extracting content from ${url}`);
        // Wait for h1 title first
        await page.waitForSelector('h1', { timeout: 10000 });
        const title = await page.$eval('h1', el => el.textContent?.trim() || '');
        console.log(`[AIRBNB] Found title: "${title}"`);
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
                    console.log(`[AIRBNB] Found content using selector: ${selector} (${content.length} chars)`);
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
            console.log(`[AIRBNB] Using body fallback for content (${content.length} chars)`);
        }
        // Get category from breadcrumb or default
        let category = 'Help Center';
        try {
            category = await page.$eval('.breadcrumb, .breadcrumbs, nav[aria-label="breadcrumb"]', el => el.textContent?.split('>').pop()?.trim() || 'Help Center');
            console.log(`[AIRBNB] Found category: ${category}`);
        }
        catch (e) {
            console.log('[AIRBNB] Could not extract category, using default');
        }
        if (content && content.length > 50) {
            const cleanedTitle = (0, parseHelpers_1.cleanText)(title);
            const cleanedContent = (0, parseHelpers_1.cleanText)(content);
            console.log(`[AIRBNB] Final title: "${cleanedTitle}"`);
            console.log(`[AIRBNB] Final content length: ${cleanedContent.length}`);
            return {
                title: cleanedTitle,
                content: cleanedContent,
                category
            };
        }
        else {
            console.log(`[AIRBNB] Insufficient content found for ${url} (${content.length} chars)`);
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
                // Debug: Check if we can access the page
                const pageTitle = await page.title();
                console.log(`[AIRBNB] Page title: "${pageTitle}"`);
                // Get all article links
                const articleLinks = await page.$$eval('a[href*="/help/article/"]', links => links.map(link => ({
                    url: link.href,
                    title: link.textContent?.trim() || '',
                })));
                console.log(`[AIRBNB] Found ${articleLinks.length} article links from main page`);
                if (articleLinks.length === 0) {
                    console.log('[AIRBNB] No article links found, trying alternative selectors...');
                    // Try alternative selectors
                    const alternativeLinks = await page.$$eval('a[href*="help"], a[href*="article"]', links => links.map(link => ({
                        url: link.href,
                        title: link.textContent?.trim() || '',
                    })));
                    console.log(`[AIRBNB] Found ${alternativeLinks.length} alternative links`);
                    articleLinks.push(...alternativeLinks);
                }
                // Process each article (increased limit for better coverage)
                for (const { url, title } of articleLinks.slice(0, 20)) {
                    try {
                        console.log(`[AIRBNB] Scraping article: ${title} (${url})`);
                        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
                        const extracted = await extractArticleContent(page, url);
                        if (extracted) {
                            articles.push({
                                url,
                                question: extracted.title || title,
                                answer: extracted.content,
                                platform: 'Airbnb',
                                category: extracted.category,
                                contentType: 'official',
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
                for (const url of AIRBNB_ARTICLES.slice(0, 6)) {
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
                                contentType: 'official',
                            });
                            console.log(`[AIRBNB] Successfully scraped known article: ${extracted.title}`);
                        }
                        else {
                            console.log(`[AIRBNB] Failed to extract content from known article: ${url}`);
                        }
                    }
                    catch (error) {
                        console.error(`[AIRBNB] Error scraping known article ${url}:`, error);
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            // If still no articles, try a different approach
            if (articles.length === 0) {
                console.log('[AIRBNB] Still no articles found, trying search-based approach...');
                try {
                    await page.goto('https://www.airbnb.com/help/search', { waitUntil: 'networkidle0', timeout: 30000 });
                    // Try to find articles through search
                    const searchLinks = await page.$$eval('a[href*="/help/"]', links => links.map(link => ({
                        url: link.href,
                        title: link.textContent?.trim() || '',
                    })));
                    console.log(`[AIRBNB] Found ${searchLinks.length} links from search page`);
                    for (const { url, title } of searchLinks.slice(0, 10)) {
                        try {
                            console.log(`[AIRBNB] Trying search result: ${title} (${url})`);
                            await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
                            const extracted = await extractArticleContent(page, url);
                            if (extracted) {
                                articles.push({
                                    url,
                                    question: extracted.title || title,
                                    answer: extracted.content,
                                    platform: 'Airbnb',
                                    category: extracted.category,
                                    contentType: 'official',
                                });
                                console.log(`[AIRBNB] Successfully scraped search result: ${extracted.title}`);
                            }
                        }
                        catch (error) {
                            console.error(`[AIRBNB] Error scraping search result ${url}:`, error);
                        }
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
                catch (error) {
                    console.error('[AIRBNB] Error with search-based approach:', error);
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
    // Validate articles before returning
    const validArticles = articles.filter(article => {
        const isValid = article.question && article.question.trim() !== '' &&
            article.answer && article.answer.length > 50;
        if (!isValid) {
            console.log(`[AIRBNB] Invalid article found: "${article.question}" (${article.answer.length} chars)`);
        }
        return isValid;
    });
    console.log(`[AIRBNB] Valid articles: ${validArticles.length} (${articles.length - validArticles.length} invalid)`);
    return validArticles;
}
//# sourceMappingURL=airbnb.js.map