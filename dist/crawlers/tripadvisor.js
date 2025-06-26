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
exports.crawlTripAdvisorArticles = crawlTripAdvisorArticles;
const cheerio = __importStar(require("cheerio"));
const fetchHtml_1 = require("../utils/fetchHtml");
const parseHelpers_1 = require("../utils/parseHelpers");
// TripAdvisor help center URLs
const TRIPADVISOR_URLS = [
    'https://tripadvisor.mediaspace.kaltura.com/channel/Help+Center/',
    'https://www.tripadvisor.com/help',
    'https://www.tripadvisor.com/help/faq',
    'https://www.tripadvisor.com/help/contact',
    'https://www.tripadvisor.com/help/terms',
    'https://www.tripadvisor.com/help/privacy',
];
// Known TripAdvisor help articles
const KNOWN_ARTICLES = [
    'https://www.tripadvisor.com/help/article-detail?articleId=1',
    'https://www.tripadvisor.com/help/article-detail?articleId=2',
    'https://www.tripadvisor.com/help/article-detail?articleId=3',
    'https://www.tripadvisor.com/help/article-detail?articleId=4',
    'https://www.tripadvisor.com/help/article-detail?articleId=5',
    'https://www.tripadvisor.com/help/article-detail?articleId=6',
    'https://www.tripadvisor.com/help/article-detail?articleId=7',
    'https://www.tripadvisor.com/help/article-detail?articleId=8',
    'https://www.tripadvisor.com/help/article-detail?articleId=9',
    'https://www.tripadvisor.com/help/article-detail?articleId=10',
];
// Browser headers to avoid being blocked
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
};
async function crawlTripAdvisorArticle(url) {
    console.log(`[TRIPADVISOR] Crawling ${url}`);
    try {
        const html = await (0, fetchHtml_1.fetchHtml)(url);
        const $ = cheerio.load(html);
        // Try multiple selectors for title and content
        const title = $('h1, .article-title, .title, .page-title, [data-testid="article-title"]').first().text().trim();
        const content = $('.article-content, .article-body, .content, .help-content, main, [data-testid="article-content"]').first().text().trim();
        // If no content found, try alternative selectors
        let finalTitle = title;
        let finalContent = content;
        if (!finalTitle) {
            const alternativeTitles = [
                $('title').text().trim(),
                $('meta[property="og:title"]').attr('content') || '',
                $('meta[name="title"]').attr('content') || '',
                $('.breadcrumb').last().text().trim(),
            ].filter(t => t && t.length > 0);
            if (alternativeTitles.length > 0) {
                finalTitle = alternativeTitles[0];
            }
            else {
                // Generate title from URL
                const urlParts = url.split('/');
                const articleId = urlParts[urlParts.length - 1] || 'unknown';
                finalTitle = `TripAdvisor Help Article ${articleId}`;
            }
        }
        if (!finalContent || finalContent.length < 50) {
            const alternativeContent = [
                $('main').text().trim(),
                $('article').text().trim(),
                $('.main-content').text().trim(),
                $('body').text().trim(),
            ].filter(c => c && c.length > 100);
            if (alternativeContent.length > 0) {
                finalContent = alternativeContent[0];
            }
            else {
                finalContent = 'Content not available';
            }
        }
        const cleanedContent = (0, parseHelpers_1.cleanText)(finalContent);
        console.log(`[TRIPADVISOR] Success: "${finalTitle}" (${cleanedContent.length} chars)`);
        return {
            platform: 'TripAdvisor',
            url,
            question: finalTitle,
            answer: cleanedContent,
            category: 'Help Center',
        };
    }
    catch (error) {
        console.error(`[TRIPADVISOR] Error crawling ${url}:`, error);
        return null;
    }
}
async function discoverTripAdvisorUrls() {
    console.log('[TRIPADVISOR] Discovering URLs...');
    const discoveredUrls = new Set();
    try {
        // Try to discover URLs from main help page
        const mainHtml = await (0, fetchHtml_1.fetchHtml)('https://www.tripadvisor.com/help');
        const $ = cheerio.load(mainHtml);
        // Find article links
        $('a[href*="/help/"], a[href*="article"]').each((_, element) => {
            const href = $(element).attr('href');
            if (href) {
                const fullUrl = href.startsWith('http') ? href : new URL(href, 'https://www.tripadvisor.com').toString();
                if (fullUrl.includes('tripadvisor.com') && fullUrl.includes('help')) {
                    discoveredUrls.add(fullUrl);
                }
            }
        });
        console.log(`[TRIPADVISOR] Discovered ${discoveredUrls.size} URLs from main page`);
    }
    catch (error) {
        console.error('[TRIPADVISOR] Error discovering URLs:', error);
    }
    // Add known articles as fallback
    KNOWN_ARTICLES.forEach(url => discoveredUrls.add(url));
    return Array.from(discoveredUrls);
}
async function crawlTripAdvisorArticles() {
    console.log('[TRIPADVISOR] Starting TripAdvisor scraping...');
    const urls = await discoverTripAdvisorUrls();
    console.log(`[TRIPADVISOR] Processing ${urls.length} URLs`);
    const articles = [];
    let successCount = 0;
    let errorCount = 0;
    for (const url of urls) {
        try {
            const article = await crawlTripAdvisorArticle(url);
            if (article) {
                articles.push(article);
                successCount++;
            }
            else {
                errorCount++;
            }
        }
        catch (error) {
            console.error(`[TRIPADVISOR] Error processing ${url}:`, error);
            errorCount++;
        }
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log(`[TRIPADVISOR] Crawl completed: ${successCount} successful, ${errorCount} failed`);
    console.log(`[TRIPADVISOR] Total valid articles: ${articles.length}`);
    return articles;
}
//# sourceMappingURL=tripadvisor.js.map