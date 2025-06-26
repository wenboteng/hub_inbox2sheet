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
exports.crawlViatorArticle = crawlViatorArticle;
exports.crawlViatorArticles = crawlViatorArticles;
const fetchHtml_1 = require("../utils/fetchHtml");
const parseHelpers_1 = require("../utils/parseHelpers");
const cheerio = __importStar(require("cheerio"));
// Updated selectors based on actual Viator help center structure
const VIATOR_SELECTORS = {
    title: 'h1, .article-title, .help-center-title, .page-title, .title, [data-testid="article-title"]',
    content: '.article-content, .help-center-content, .article-body, .content, .article-text, [data-testid="article-content"]',
};
// Comprehensive list of discovered Viator article URLs
const VIATOR_ARTICLE_URLS = [
    // From main help page discovery
    'https://www.viator.com/help/articles/35',
    'https://www.viator.com/help/articles/33',
    'https://www.viator.com/help/articles/24',
    'https://www.viator.com/help/articles/81',
    // From systematic testing
    'https://www.viator.com/help/articles/5',
    'https://www.viator.com/help/articles/6',
    'https://www.viator.com/help/articles/7',
    'https://www.viator.com/help/articles/11',
    'https://www.viator.com/help/articles/12',
    'https://www.viator.com/help/articles/14',
    'https://www.viator.com/help/articles/15',
    'https://www.viator.com/help/articles/16',
    'https://www.viator.com/help/articles/17',
    'https://www.viator.com/help/articles/18',
    'https://www.viator.com/help/articles/19',
    'https://www.viator.com/help/articles/23',
    'https://www.viator.com/help/articles/25',
    'https://www.viator.com/help/articles/26',
    'https://www.viator.com/help/articles/27',
    'https://www.viator.com/help/articles/28',
    'https://www.viator.com/help/articles/29',
    'https://www.viator.com/help/articles/30',
    'https://www.viator.com/help/articles/31',
    'https://www.viator.com/help/articles/34',
    'https://www.viator.com/help/articles/36',
    'https://www.viator.com/help/articles/37',
    'https://www.viator.com/help/articles/39',
    'https://www.viator.com/help/articles/40',
    'https://www.viator.com/help/articles/42',
    'https://www.viator.com/help/articles/45',
    'https://www.viator.com/help/articles/46',
    'https://www.viator.com/help/articles/47',
    'https://www.viator.com/help/articles/48',
    'https://www.viator.com/help/articles/49',
    'https://www.viator.com/help/articles/50',
    'https://www.viator.com/help/articles/51',
    'https://www.viator.com/help/articles/52',
    'https://www.viator.com/help/articles/53',
    'https://www.viator.com/help/articles/54',
    'https://www.viator.com/help/articles/55',
    'https://www.viator.com/help/articles/56',
    'https://www.viator.com/help/articles/58',
    'https://www.viator.com/help/articles/59',
    'https://www.viator.com/help/articles/60',
];
async function crawlViatorArticle(url) {
    console.log(`[VIATOR] Crawling ${url}`);
    try {
        const html = await (0, fetchHtml_1.fetchHtml)(url);
        const parsed = (0, parseHelpers_1.parseContent)(html, VIATOR_SELECTORS);
        // Enhanced debugging
        console.log(`[VIATOR] Raw title: "${parsed.title}"`);
        console.log(`[VIATOR] Content length: ${parsed.content.length}`);
        if (!parsed.title || parsed.title.trim() === '') {
            console.log(`[VIATOR] Warning: Empty title for ${url}`);
            console.log(`[VIATOR] Trying alternative title extraction...`);
            // Try alternative title extraction
            const $ = cheerio.load(html);
            const alternativeTitles = [
                $('title').text().trim(),
                $('meta[property="og:title"]').attr('content') || '',
                $('meta[name="title"]').attr('content') || '',
                $('.breadcrumb').last().text().trim(),
                $('nav').find('a').last().text().trim(),
            ].filter(title => title && title.length > 0);
            if (alternativeTitles.length > 0) {
                parsed.title = alternativeTitles[0];
                console.log(`[VIATOR] Found alternative title: "${parsed.title}"`);
            }
            else {
                // Generate a unique title from the URL and content
                const urlParts = url.split('/');
                const articleId = urlParts[urlParts.length - 1];
                // Try to extract meaningful content for title generation
                let contentPreview = '';
                if (parsed.content && parsed.content.length > 0) {
                    // Take first 100 characters and clean them
                    contentPreview = parsed.content.substring(0, 100)
                        .replace(/[^\w\s]/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                }
                // Generate a unique title
                if (contentPreview && contentPreview.length > 10) {
                    // Use first meaningful sentence or phrase
                    const firstSentence = contentPreview.split(/[.!?]/)[0].trim();
                    if (firstSentence.length > 5) {
                        parsed.title = `Viator Help - ${firstSentence}`;
                    }
                    else {
                        parsed.title = `Viator Help Article ${articleId}`;
                    }
                }
                else {
                    parsed.title = `Viator Help Article ${articleId}`;
                }
                console.log(`[VIATOR] Generated unique title: "${parsed.title}"`);
            }
        }
        if (!parsed.content || parsed.content.trim() === '') {
            console.log(`[VIATOR] Warning: Empty content for ${url}`);
            console.log(`[VIATOR] Trying alternative content extraction...`);
            // Try alternative content extraction
            const $ = cheerio.load(html);
            const alternativeContent = [
                $('main').text().trim(),
                $('article').text().trim(),
                $('.main-content').text().trim(),
                $('body').text().trim(),
            ].filter(content => content && content.length > 100);
            if (alternativeContent.length > 0) {
                parsed.content = alternativeContent[0];
                console.log(`[VIATOR] Found alternative content (${parsed.content.length} chars)`);
            }
        }
        // Final validation and unique title generation
        if (!parsed.title || parsed.title.trim() === '') {
            console.log(`[VIATOR] Error: Still no title found for ${url}`);
            const urlParts = url.split('/');
            const articleId = urlParts[urlParts.length - 1];
            parsed.title = `Viator Help Article ${articleId}`;
        }
        if (!parsed.content || parsed.content.trim() === '') {
            console.log(`[VIATOR] Error: Still no content found for ${url}`);
            parsed.content = 'Content not available';
        }
        // Ensure title is unique by adding article ID if it's generic
        if (parsed.title === 'Help Center' || parsed.title === 'Viator Help Article') {
            const urlParts = url.split('/');
            const articleId = urlParts[urlParts.length - 1];
            parsed.title = `Viator Help Article ${articleId}`;
            console.log(`[VIATOR] Made title unique: "${parsed.title}"`);
        }
        const cleanedContent = (0, parseHelpers_1.cleanText)(parsed.content);
        console.log(`[VIATOR] Final title: "${parsed.title}"`);
        console.log(`[VIATOR] Final content length: ${cleanedContent.length}`);
        return {
            platform: 'Viator',
            url,
            question: parsed.title,
            answer: cleanedContent,
            rawHtml: parsed.rawHtml,
        };
    }
    catch (error) {
        console.error(`[VIATOR] Error crawling ${url}:`, error);
        // Return a minimal article to avoid breaking the process
        const urlParts = url.split('/');
        const articleId = urlParts[urlParts.length - 1];
        return {
            platform: 'Viator',
            url,
            question: `Viator Help Article ${articleId}`,
            answer: 'Content not available due to crawling error',
        };
    }
}
async function crawlViatorArticles() {
    const helpCenterUrl = 'https://www.viator.com/help/';
    console.log(`[VIATOR] Starting discovery from ${helpCenterUrl}`);
    const discoveredUrls = new Set();
    try {
        const mainHtml = await (0, fetchHtml_1.fetchHtml)(helpCenterUrl);
        const $ = cheerio.load(mainHtml);
        console.log(`[VIATOR] Main page HTML length: ${mainHtml.length}`);
        // Enhanced selectors for finding article links
        const articleSelectors = [
            'a[href*="/help/articles/"]',
            'a[href*="/help/article/"]',
            '.article-link',
            '.help-article-link',
            'a[href*="help"]',
        ];
        let totalLinksFound = 0;
        for (const selector of articleSelectors) {
            const links = $(selector);
            console.log(`[VIATOR] Found ${links.length} links with selector: ${selector}`);
            totalLinksFound += links.length;
            links.each((i, el) => {
                const href = $(el).attr('href');
                if (href) {
                    const fullUrl = href.startsWith('http') ? href : new URL(href, helpCenterUrl).toString();
                    if (fullUrl.includes('/help/') && fullUrl.includes('/articles/')) {
                        discoveredUrls.add(fullUrl);
                    }
                }
            });
        }
        console.log(`[VIATOR] Total links found: ${totalLinksFound}`);
        console.log(`[VIATOR] Unique article URLs discovered: ${discoveredUrls.size}`);
        // Add all known URLs from our comprehensive list
        VIATOR_ARTICLE_URLS.forEach(url => discoveredUrls.add(url));
        console.log(`[VIATOR] Added ${VIATOR_ARTICLE_URLS.length} known URLs from comprehensive list`);
    }
    catch (error) {
        console.error(`[VIATOR] Failed to crawl main help page ${helpCenterUrl}:`, error);
        // Fallback to comprehensive known URLs if main page fails
        console.log(`[VIATOR] Using fallback comprehensive known URLs...`);
        VIATOR_ARTICLE_URLS.forEach(url => discoveredUrls.add(url));
    }
    const uniqueUrls = Array.from(discoveredUrls);
    console.log(`[VIATOR] Final unique article URLs: ${uniqueUrls.length}`);
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    for (const url of uniqueUrls) {
        try {
            console.log(`[VIATOR] Processing: ${url}`);
            const article = await crawlViatorArticle(url);
            // Validate the article before adding
            if (article.question && article.question.trim() !== '' &&
                article.answer && article.answer.length > 50) {
                results.push(article);
                successCount++;
                console.log(`[VIATOR] Success: "${article.question}" (${article.answer.length} chars)`);
            }
            else {
                console.log(`[VIATOR] Skipping invalid article: "${article.question}" (${article.answer.length} chars)`);
                errorCount++;
            }
            // Add a small delay between requests to avoid being blocked
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        catch (error) {
            console.error(`[VIATOR] Failed to crawl article ${url}:`, error);
            errorCount++;
        }
    }
    console.log(`[VIATOR] Crawl completed: ${successCount} successful, ${errorCount} failed`);
    console.log(`[VIATOR] Total valid articles: ${results.length}`);
    return results;
}
//# sourceMappingURL=viator.js.map