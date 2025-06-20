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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlGetYourGuideArticle = crawlGetYourGuideArticle;
exports.crawlGetYourGuideArticlesWithPagination = crawlGetYourGuideArticlesWithPagination;
exports.crawlGetYourGuideArticles = crawlGetYourGuideArticles;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
// Base URL for GetYourGuide supplier help center
const BASE_URL = 'https://supply.getyourguide.support';
// Verified GetYourGuide supplier help center articles and categories
const VERIFIED_URLS = [
    // Main categories to discover articles from
    'https://supply.getyourguide.support/hc/en-us/categories/13013952719901-Suppliers-FAQs',
    'https://supply.getyourguide.support/hc/en-us/categories/13013952719902-Getting-Started',
    'https://supply.getyourguide.support/hc/en-us/categories/13013952719903-Account-Management',
    'https://supply.getyourguide.support/hc/en-us/categories/13013952719904-Bookings',
    'https://supply.getyourguide.support/hc/en-us/categories/13013952719905-Payments',
    'https://supply.getyourguide.support/hc/en-us/categories/13013952719906-Content-Management',
    'https://supply.getyourguide.support/hc/en-us/categories/13013952719907-Technical-Support',
    // Individual articles as fallback
    'https://supply.getyourguide.support/hc/en-us/articles/13980989354141',
];
// Additional category URLs discovered through exploration
const ADDITIONAL_CATEGORIES = [
    'https://supply.getyourguide.support/hc/en-us/categories/13013952719908-Product-Features',
    'https://supply.getyourguide.support/hc/en-us/categories/13013952719909-Best-Practices',
    'https://supply.getyourguide.support/hc/en-us/categories/13013952719910-Troubleshooting',
    'https://supply.getyourguide.support/hc/en-us/categories/13013952719911-API-Documentation',
    'https://supply.getyourguide.support/hc/en-us/categories/13013952719912-Integration-Guides',
];
// Pagination configuration
const PAGINATION_CONFIG = {
    maxPages: 10, // Maximum pages to crawl per category
    articlesPerPage: 20, // Expected articles per page
    delayBetweenPages: 3000, // 3 seconds between page requests
    delayBetweenArticles: 2000, // 2 seconds between article requests
};
// Basic browser headers to avoid being blocked
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
};
// Soft-404 detection
function isSoft404(title, content) {
    const soft404Indicators = [
        'Hi, how can we help?',
        'Page not found',
        '404',
        'Not Found',
        'Help Center',
        'Search'
    ];
    return (soft404Indicators.some(indicator => title.includes(indicator)) ||
        content.length < 50 ||
        !content.trim());
}
// Extract article links from a category page
async function extractArticleLinks(url) {
    console.log(`[GETYOURGUIDE] Extracting article links from ${url}`);
    try {
        const response = await axios_1.default.get(url, {
            headers: {
                ...BROWSER_HEADERS,
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: (status) => status === 200
        });
        const $ = cheerio.load(response.data);
        const links = [];
        // Find all article links
        $('a[href*="/articles/"]').each((_, element) => {
            const href = $(element).attr('href');
            if (href && !href.includes('#')) {
                const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                if (!links.includes(fullUrl)) {
                    links.push(fullUrl);
                }
            }
        });
        console.log(`[GETYOURGUIDE] Found ${links.length} article links in ${url}`);
        return links;
    }
    catch (error) {
        console.error(`[GETYOURGUIDE][ERROR] Failed to extract article links from ${url}:`, error);
        return [];
    }
}
// Simple pagination detection
function detectPagination(html, baseUrl) {
    const paginationInfo = {
        hasNextPage: false,
        currentPage: 1,
    };
    try {
        // Simple regex-based pagination detection
        const nextPageRegex = /href="([^"]*)"[^>]*>.*?Next.*?</i;
        const match = html.match(nextPageRegex);
        if (match && match[1]) {
            const nextPageUrl = match[1].startsWith('http') ? match[1] : `${BASE_URL}${match[1]}`;
            paginationInfo.hasNextPage = true;
            paginationInfo.nextPageUrl = nextPageUrl;
            console.log(`[GETYOURGUIDE] Found next page: ${nextPageUrl}`);
        }
        // Try to detect current page from URL
        const pageMatch = baseUrl.match(/[?&]page=(\d+)/);
        if (pageMatch) {
            paginationInfo.currentPage = parseInt(pageMatch[1]);
        }
    }
    catch (error) {
        console.error(`[GETYOURGUIDE][ERROR] Error detecting pagination:`, error);
    }
    return paginationInfo;
}
// Extract category name from URL
function extractCategoryName(url) {
    try {
        const urlMatch = url.match(/categories\/(\d+)-([^\/]+)/);
        if (urlMatch) {
            return urlMatch[2].replace(/-/g, ' ');
        }
        return url.split('/').pop()?.replace(/-/g, ' ') || 'Unknown Category';
    }
    catch (error) {
        console.error(`[GETYOURGUIDE][ERROR] Error extracting category name:`, error);
        return 'Unknown Category';
    }
}
async function crawlGetYourGuideArticle(url) {
    if (!url.startsWith('https://supply.getyourguide.support/')) {
        console.error(`[GETYOURGUIDE][ERROR] Invalid domain. Only supply.getyourguide.support is allowed: ${url}`);
        return null;
    }
    console.log(`[GETYOURGUIDE] Crawling ${url}`);
    try {
        const response = await axios_1.default.get(url, {
            headers: {
                ...BROWSER_HEADERS,
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: (status) => status === 200
        });
        const $ = cheerio.load(response.data);
        // Try multiple selectors for title and content
        const title = $('h1, .article-title, .title-text, .article__title, .lt-article__title').first().text().trim();
        const content = $('#main-content, .article-body, .article-content, main article, .article__content, .lt-article__content').first().text().trim();
        // Log raw HTML for debugging if no content found
        if (!content) {
            console.warn(`[GETYOURGUIDE][WARN] No content found. Raw HTML snippet:`);
            console.warn(response.data.substring(0, 500) + '...');
            // Try to find any text content
            const bodyText = $('body').text().trim();
            console.warn(`[GETYOURGUIDE][WARN] Body text length: ${bodyText.length}`);
            if (bodyText.length > 0) {
                console.warn(`[GETYOURGUIDE][WARN] First 500 chars of body text: ${bodyText.substring(0, 500)}...`);
            }
        }
        // Basic validation
        if (!title || !content || content.length < 50) {
            console.warn(`[GETYOURGUIDE][WARN] Invalid content for ${url}`);
            console.warn(`[GETYOURGUIDE][WARN] Title: "${title}"`);
            console.warn(`[GETYOURGUIDE][WARN] Content length: ${content.length}`);
            return null;
        }
        // Check for soft-404
        if (isSoft404(title, content)) {
            console.warn(`[GETYOURGUIDE][WARN] Detected soft-404 for ${url}`);
            return null;
        }
        console.log(`[GETYOURGUIDE][SUCCESS] Found content:`);
        console.log(`[GETYOURGUIDE][SUCCESS] Title: ${title}`);
        console.log(`[GETYOURGUIDE][SUCCESS] Content preview: ${content.substring(0, 100)}...`);
        return {
            platform: 'GetYourGuide',
            url,
            question: title,
            answer: content,
        };
    }
    catch (error) {
        console.error(`[GETYOURGUIDE][ERROR] Failed to crawl ${url}:`, error);
        return null;
    }
}
// Enhanced crawler with pagination support
async function crawlGetYourGuideArticlesWithPagination(urls = [...VERIFIED_URLS, ...ADDITIONAL_CATEGORIES]) {
    console.log('[GETYOURGUIDE] Starting enhanced crawl with pagination support');
    console.log(`[GETYOURGUIDE] Processing ${urls.length} category URLs`);
    const results = [];
    const processedUrls = new Set();
    for (const categoryUrl of urls) {
        try {
            console.log(`\n[GETYOURGUIDE] Processing category: ${categoryUrl}`);
            const categoryName = extractCategoryName(categoryUrl);
            let currentPage = 1;
            let currentUrl = categoryUrl;
            let totalArticlesInCategory = 0;
            // Process pages for this category
            while (currentPage <= PAGINATION_CONFIG.maxPages) {
                console.log(`[GETYOURGUIDE] Processing page ${currentPage} of category: ${categoryName}`);
                try {
                    const response = await axios_1.default.get(currentUrl, {
                        headers: {
                            ...BROWSER_HEADERS,
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                            'Connection': 'keep-alive',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        },
                        timeout: 10000,
                        maxRedirects: 5,
                        validateStatus: (status) => status === 200
                    });
                    const $ = cheerio.load(response.data);
                    const articleLinks = [];
                    // Extract article links from current page
                    $('a[href*="/articles/"]').each((_, element) => {
                        const href = $(element).attr('href');
                        if (href && !href.includes('#')) {
                            const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                            if (!articleLinks.includes(fullUrl)) {
                                articleLinks.push(fullUrl);
                            }
                        }
                    });
                    console.log(`[GETYOURGUIDE] Found ${articleLinks.length} articles on page ${currentPage}`);
                    // Process articles on this page
                    for (const articleUrl of articleLinks) {
                        if (!processedUrls.has(articleUrl)) {
                            processedUrls.add(articleUrl);
                            // Add delay between article requests
                            await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.delayBetweenArticles));
                            const article = await crawlGetYourGuideArticle(articleUrl);
                            if (article) {
                                article.category = categoryName;
                                results.push(article);
                                totalArticlesInCategory++;
                                console.log(`[GETYOURGUIDE] Successfully crawled: ${articleUrl}`);
                                console.log(`[GETYOURGUIDE] Title: ${article.question}`);
                                console.log(`[GETYOURGUIDE] Content length: ${article.answer.length} characters`);
                            }
                        }
                    }
                    // Check for next page
                    const paginationInfo = detectPagination(response.data, currentUrl);
                    if (paginationInfo.hasNextPage && paginationInfo.nextPageUrl) {
                        currentUrl = paginationInfo.nextPageUrl;
                        currentPage++;
                        // Add delay between page requests
                        await new Promise(resolve => setTimeout(resolve, PAGINATION_CONFIG.delayBetweenPages));
                    }
                    else {
                        console.log(`[GETYOURGUIDE] No more pages for category: ${categoryName}`);
                        break;
                    }
                }
                catch (pageError) {
                    console.error(`[GETYOURGUIDE][ERROR] Failed to process page ${currentPage} of ${categoryUrl}:`, pageError);
                    break;
                }
            }
            console.log(`[GETYOURGUIDE] Completed category "${categoryName}": ${totalArticlesInCategory} articles`);
        }
        catch (error) {
            console.error(`[GETYOURGUIDE][ERROR] Failed to process category ${categoryUrl}:`, error);
        }
    }
    console.log(`[GETYOURGUIDE] Enhanced crawl completed: ${results.length} total articles`);
    return results;
}
// Legacy function for backward compatibility
async function crawlGetYourGuideArticles(urls = VERIFIED_URLS) {
    console.log('[GETYOURGUIDE] Starting legacy crawl (no pagination)');
    return crawlGetYourGuideArticlesWithPagination(urls);
}
