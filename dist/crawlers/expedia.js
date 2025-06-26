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
exports.crawlExpedia = crawlExpedia;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const client_1 = require("@prisma/client");
const languageDetection_1 = require("../utils/languageDetection");
const slugify_1 = require("../utils/slugify");
const prisma = new client_1.PrismaClient();
// Updated Expedia help URLs - using correct domain
const EXPEDIA_HELP_URLS = [
    'https://www.expedia.com/help/article/booking',
    'https://www.expedia.com/help/article/cancellation',
    'https://www.expedia.com/help/article/refund',
    'https://www.expedia.com/help/article/payment',
    'https://www.expedia.com/help/article/account',
    'https://www.expedia.com/help/article/safety',
    'https://www.expedia.com/help/article/contact',
    'https://www.expedia.com/help/article/terms',
    'https://www.expedia.com/help/article/privacy',
    'https://www.expedia.com/help/article/accessibility',
];
// Alternative Expedia help pages that are more likely to work
const EXPEDIA_ALTERNATIVE_URLS = [
    'https://www.expedia.com/help/booking',
    'https://www.expedia.com/help/cancellation',
    'https://www.expedia.com/help/refund',
    'https://www.expedia.com/help/payment',
    'https://www.expedia.com/help/account',
    'https://www.expedia.com/help/safety',
    'https://www.expedia.com/help/contact',
    'https://www.expedia.com/help/terms',
    'https://www.expedia.com/help/privacy',
    'https://www.expedia.com/help/accessibility',
];
async function fetchHtml(url) {
    try {
        console.log(`[EXPEDIA] Fetching: ${url}`);
        const response = await axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            timeout: 30000,
        });
        return response.data;
    }
    catch (error) {
        if (error.response?.status === 429) {
            console.log(`[EXPEDIA] Rate limited for ${url}, waiting 5 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return ''; // Return empty to skip this URL
        }
        console.error(`[EXPEDIA] Error fetching ${url}:`, error.message);
        return '';
    }
}
async function crawlExpediaHelp() {
    console.log('[EXPEDIA] Starting Expedia help crawling...');
    const articles = [];
    // Try the main help page first
    const mainHtml = await fetchHtml('https://www.expedia.com/help');
    if (mainHtml) {
        const $ = cheerio.load(mainHtml);
        // Look for help article links
        const helpLinks = [];
        $('a[href*="/help/"], a[href*="/article/"]').each((_, element) => {
            const href = $(element).attr('href');
            if (href && helpLinks.length < 10) {
                const fullUrl = href.startsWith('http') ? href : new URL(href, 'https://www.expedia.com').toString();
                helpLinks.push(fullUrl);
            }
        });
        for (const url of helpLinks) {
            try {
                const articleHtml = await fetchHtml(url);
                if (articleHtml) {
                    const article = await extractArticleFromPage(articleHtml, url);
                    if (article) {
                        articles.push(article);
                    }
                }
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            catch (error) {
                console.error(`[EXPEDIA] Error processing ${url}:`, error);
            }
        }
    }
    // If we didn't get enough articles, try alternative URLs
    if (articles.length < 5) {
        console.log('[EXPEDIA] Trying alternative URLs...');
        for (const url of EXPEDIA_ALTERNATIVE_URLS.slice(0, 5)) {
            try {
                const html = await fetchHtml(url);
                if (html) {
                    const article = await extractArticleFromPage(html, url);
                    if (article) {
                        articles.push(article);
                    }
                }
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            catch (error) {
                console.error(`[EXPEDIA] Error processing alternative URL ${url}:`, error);
            }
        }
    }
    console.log(`[EXPEDIA] Found ${articles.length} articles`);
    return articles;
}
async function extractArticleFromPage(html, url) {
    try {
        const $ = cheerio.load(html);
        // Try multiple selectors for title
        const titleSelectors = [
            'h1',
            '.help-article-title',
            '.article-title',
            '.page-title',
            '.title',
            'title'
        ];
        let title = '';
        for (const selector of titleSelectors) {
            title = $(selector).first().text().trim();
            if (title)
                break;
        }
        if (!title) {
            console.log(`[EXPEDIA] No title found for ${url}`);
            return null;
        }
        // Try multiple selectors for content
        const contentSelectors = [
            '.help-article-content',
            '.article-content',
            '.content',
            '.main-content',
            '.post-content',
            'main',
            'article'
        ];
        let content = '';
        for (const selector of contentSelectors) {
            const element = $(selector).first();
            if (element.length) {
                content = element.text().trim();
                if (content.length > 100)
                    break;
            }
        }
        if (!content || content.length < 50) {
            console.log(`[EXPEDIA] Insufficient content for ${url}`);
            return null;
        }
        // Determine category based on URL or content
        let category = 'Help Center';
        if (url.includes('cancellation'))
            category = 'Cancellation Policy';
        else if (url.includes('refund'))
            category = 'Refund Policy';
        else if (url.includes('payment'))
            category = 'Payment';
        else if (url.includes('booking'))
            category = 'Booking';
        else if (url.includes('safety'))
            category = 'Safety';
        else if (url.includes('terms'))
            category = 'Terms of Service';
        else if (url.includes('privacy'))
            category = 'Privacy Policy';
        return {
            url,
            question: title,
            answer: content,
            category,
            platform: 'Expedia'
        };
    }
    catch (error) {
        console.error(`[EXPEDIA] Error extracting article from ${url}:`, error);
        return null;
    }
}
async function saveToDatabase(articles) {
    console.log(`[EXPEDIA] Saving ${articles.length} articles to database...`);
    for (const article of articles) {
        try {
            // Check if article already exists
            const existing = await prisma.article.findUnique({ where: { url: article.url } });
            if (existing) {
                console.log(`[EXPEDIA] Article already exists: ${article.url}`);
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
            // Create article
            await prisma.article.create({
                data: {
                    url: article.url,
                    question: article.question,
                    answer: article.answer,
                    slug: uniqueSlug,
                    category: article.category,
                    platform: article.platform,
                    contentType: 'official',
                    source: 'help_center',
                    language: languageDetection.language,
                    crawlStatus: 'active',
                }
            });
            console.log(`[EXPEDIA] Saved article: ${article.question}`);
        }
        catch (error) {
            console.error(`[EXPEDIA] Error saving article ${article.url}:`, error);
        }
    }
}
async function crawlExpedia() {
    try {
        const articles = await crawlExpediaHelp();
        await saveToDatabase(articles);
        return articles;
    }
    catch (error) {
        console.error('[EXPEDIA] Error in Expedia crawler:', error);
        return [];
    }
    finally {
        await prisma.$disconnect();
    }
}
// For standalone testing
if (require.main === module) {
    crawlExpedia().then(articles => {
        console.log(`[EXPEDIA] Crawling completed. Found ${articles.length} articles.`);
        process.exit(0);
    }).catch(error => {
        console.error('[EXPEDIA] Crawling failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=expedia.js.map