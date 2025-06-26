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
exports.scrapeUrls = scrapeUrls;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Basic browser headers to avoid being blocked
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
};
const SCRAPER_CONFIGS = {
    airbnb: {
        name: 'Airbnb',
        baseUrl: 'https://www.airbnb.com/help/',
        selectors: {
            title: 'h1, .article-title, .help-center-article-title',
            content: '.article-body, .help-center-article-body, .article-content',
        },
        cleanContent: (content) => content.replace(/\s+/g, ' ').trim(),
    },
    booking: {
        name: 'Booking.com',
        baseUrl: 'https://partner.booking.com/en-us/help/',
        // Use Booking.com Partner API instead of web scraping
        fetchContent: async (url) => {
            const articleId = url.split('/').pop();
            const response = await axios_1.default.get(`https://distribution-xml.booking.com/json/bookings.getHelpArticle`, {
                headers: {
                    'Authorization': `Bearer ${process.env.BOOKING_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                params: {
                    article_id: articleId,
                },
            });
            return {
                title: response.data.title,
                content: response.data.content,
            };
        },
    },
    getyourguide: {
        name: 'GetYourGuide',
        baseUrl: 'https://supply.getyourguide.support/hc/en-us/articles/',
        selectors: {
            title: 'h1.article-title',
            content: 'div.article-body',
        },
        cleanContent: (content) => content.replace(/\s+/g, ' ').trim(),
    },
    expedia: {
        name: 'Expedia',
        baseUrl: 'https://apps.expediapartnercentral.com/help/',
        // Use Expedia Partner API instead of web scraping
        fetchContent: async (url) => {
            const articleId = url.split('/').pop();
            const response = await axios_1.default.get(`https://api.ean.com/v3/help/articles/${articleId}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.EXPEDIA_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            });
            return {
                title: response.data.title,
                content: response.data.content,
            };
        },
    },
};
// Helper function to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// Helper function to get random delay between 2-5 seconds
const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
async function scrapePage(url, config) {
    try {
        console.log(`[SCRAPER] Scraping ${url} (${config.name})`);
        let title;
        let content;
        if (config.fetchContent) {
            // Use API to fetch content
            const result = await config.fetchContent(url);
            title = result.title;
            content = result.content;
        }
        else {
            // Use web scraping
            const response = await axios_1.default.get(url, {
                headers: BROWSER_HEADERS,
                timeout: 10000,
            });
            if (response.status !== 200) {
                console.log(`[SCRAPER][WARN] Non-200 status code (${response.status}) for ${url}`);
                return;
            }
            const $ = cheerio.load(response.data);
            // Extract title and content
            title = $(config.selectors.title).first().text().trim();
            content = $(config.selectors.content).first().text().trim();
        }
        // Log what we found
        console.log(`[SCRAPER][DEBUG] Page title: ${title}`);
        console.log(`[SCRAPER][DEBUG] Content length: ${content.length} characters`);
        console.log(`[SCRAPER][DEBUG] Content preview: ${content.substring(0, 100)}...`);
        if (!title || !content || content.length < 50) {
            console.log(`[SCRAPER][WARN] Invalid content for ${url}`);
            console.log(`[SCRAPER][WARN] Title: "${title}"`);
            console.log(`[SCRAPER][WARN] Content length: ${content.length}`);
            return;
        }
        // Clean content if needed
        const cleanedContent = config.cleanContent ? config.cleanContent(content) : content;
        // Store in database
        await prisma.answer.upsert({
            where: { sourceUrl: url },
            create: {
                question: title,
                answer: cleanedContent,
                firstAnswerParagraph: cleanedContent.split('\n')[0],
                sourceUrl: url,
                platform: config.name,
                category: 'help-center',
                tags: [],
            },
            update: {
                question: title,
                answer: cleanedContent,
                firstAnswerParagraph: cleanedContent.split('\n')[0],
                platform: config.name,
            },
        });
        console.log(`[SCRAPER] Successfully processed: ${url}`);
        // Add a random delay between 2-5 seconds before the next request
        await delay(getRandomDelay(2000, 5000));
    }
    catch (error) {
        console.error(`[SCRAPER] Error scraping ${url}:`, error);
    }
}
// Main function to scrape a list of URLs
async function scrapeUrls(urls) {
    console.log(`[SCRAPER] Starting scrape of ${urls.length} URLs`);
    for (const url of urls) {
        // Determine which scraper config to use based on URL
        const platform = Object.values(SCRAPER_CONFIGS).find(config => url.includes(config.baseUrl));
        if (!platform) {
            console.log(`[SCRAPER][WARN] No scraper config found for URL: ${url}`);
            continue;
        }
        await scrapePage(url, platform);
    }
    console.log('[SCRAPER] Scrape process completed');
}
//# sourceMappingURL=crawler.js.map