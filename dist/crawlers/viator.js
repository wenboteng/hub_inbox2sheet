"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlViatorArticle = crawlViatorArticle;
exports.crawlViatorArticles = crawlViatorArticles;
const fetchHtml_1 = require("../utils/fetchHtml");
const parseHelpers_1 = require("../utils/parseHelpers");
const VIATOR_SELECTORS = {
    title: 'h1, .article-title, .help-center-title',
    content: '.article-content, .help-center-content, .article-body',
};
// Initial set of Viator help articles to crawl
const VIATOR_ARTICLES = [
    'https://www.viator.com/help/articles/1073', // How to cancel a booking
    'https://www.viator.com/help/articles/1074', // How to request a refund
    'https://www.viator.com/help/articles/1075', // How to contact customer service
    'https://www.viator.com/help/articles/1076', // How to modify a booking
    'https://www.viator.com/help/articles/1077', // How to leave a review
];
async function crawlViatorArticle(url) {
    console.log(`[VIATOR] Crawling ${url}`);
    const html = await (0, fetchHtml_1.fetchHtml)(url);
    const parsed = (0, parseHelpers_1.parseContent)(html, VIATOR_SELECTORS);
    if (!parsed.title || !parsed.content) {
        console.log(`[VIATOR] Warning: Missing content for ${url}`);
        console.log(`[VIATOR] Title found: ${parsed.title ? 'Yes' : 'No'}`);
        console.log(`[VIATOR] Content length: ${parsed.content.length}`);
    }
    return {
        platform: 'Viator',
        url,
        question: parsed.title,
        answer: (0, parseHelpers_1.cleanText)(parsed.content),
        rawHtml: parsed.rawHtml,
    };
}
async function crawlViatorArticles() {
    console.log('[VIATOR] Starting crawl of Viator articles');
    const results = [];
    for (const url of VIATOR_ARTICLES) {
        try {
            const article = await crawlViatorArticle(url);
            results.push(article);
            // Add a small delay between requests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        catch (error) {
            console.error(`[VIATOR] Failed to crawl ${url}:`, error);
        }
    }
    console.log(`[VIATOR] Completed crawl of ${results.length} articles`);
    return results;
}
