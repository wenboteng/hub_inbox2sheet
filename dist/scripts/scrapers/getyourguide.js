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
exports.scrapeGetYourGuide = scrapeGetYourGuide;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
async function scrapeGetYourGuide() {
    const articles = [];
    const baseUrl = 'https://supply.getyourguide.support';
    try {
        // Get the main help center page
        const response = await axios_1.default.get(baseUrl);
        const $ = cheerio.load(response.data);
        // Get all category links
        const categoryLinks = $('a[href*="/categories/"]')
            .map((_, el) => ({
            url: new URL($(el).attr('href') || '', baseUrl).toString(),
            category: $(el).text().trim(),
        }))
            .get();
        // Process each category
        for (const { url: categoryUrl, category } of categoryLinks) {
            try {
                const categoryResponse = await axios_1.default.get(categoryUrl);
                const $category = cheerio.load(categoryResponse.data);
                // Get all article links in this category
                const articleLinks = $category('a[href*="/articles/"]')
                    .map((_, el) => ({
                    url: new URL($category(el).attr('href') || '', baseUrl).toString(),
                    title: $category(el).text().trim(),
                }))
                    .get();
                // Process each article
                for (const { url, title } of articleLinks) {
                    try {
                        const articleResponse = await axios_1.default.get(url);
                        const $article = cheerio.load(articleResponse.data);
                        // Extract article content
                        const content = $article('article').text().trim();
                        articles.push({
                            url,
                            question: title,
                            answer: content,
                            platform: 'GetYourGuide',
                            category,
                        });
                    }
                    catch (error) {
                        console.error(`Error scraping article ${url}:`, error);
                    }
                }
            }
            catch (error) {
                console.error(`Error scraping category ${categoryUrl}:`, error);
            }
        }
    }
    catch (error) {
        console.error('Error scraping GetYourGuide help center:', error);
    }
    return articles;
}
