"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlAirHostsForum = crawlAirHostsForum;
const puppeteer_1 = require("../src/utils/puppeteer");
async function crawlAirHostsForum() {
    console.log('[AIRHOSTS] Starting AirHosts Forum crawling...');
    const posts = [];
    try {
        const browser = await (0, puppeteer_1.createBrowser)();
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        // AirHosts Forum categories to crawl
        const categories = [
            'https://airhostsforum.com/c/hosting-discussions',
            'https://airhostsforum.com/c/guest-issues',
            'https://airhostsforum.com/c/technical-support',
            'https://airhostsforum.com/c/business-advice',
        ];
        for (const categoryUrl of categories) {
            try {
                console.log(`[AIRHOSTS] Crawling category: ${categoryUrl}`);
                await page.goto(categoryUrl, { waitUntil: 'networkidle0', timeout: 30000 });
                // Get topic links
                const topicLinks = await page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('a[href*="/t/"]'));
                    return links.slice(0, 10).map(link => link.href);
                });
                for (const topicUrl of topicLinks) {
                    try {
                        await page.goto(topicUrl, { waitUntil: 'networkidle0', timeout: 30000 });
                        const postData = await page.evaluate(() => {
                            const titleElement = document.querySelector('h1, .topic-title');
                            const contentElement = document.querySelector('.post-content, .cooked');
                            if (!titleElement || !contentElement)
                                return null;
                            const title = titleElement.textContent?.trim() || '';
                            const content = contentElement.textContent?.trim() || '';
                            return {
                                title,
                                content,
                                url: window.location.href
                            };
                        });
                        if (postData && postData.title && postData.content && postData.content.length > 100) {
                            posts.push({
                                url: postData.url,
                                question: postData.title,
                                answer: postData.content,
                                platform: 'AirHosts Forum',
                                category: 'Hosting Discussion'
                            });
                        }
                        // Small delay between requests
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    catch (error) {
                        console.error(`[AIRHOSTS] Error crawling topic ${topicUrl}:`, error);
                    }
                }
            }
            catch (error) {
                console.error(`[AIRHOSTS] Error crawling category ${categoryUrl}:`, error);
            }
        }
        await browser.close();
    }
    catch (error) {
        console.error('[AIRHOSTS] Error in AirHosts Forum crawling:', error);
    }
    console.log(`[AIRHOSTS] Found ${posts.length} posts`);
    return posts;
}
//# sourceMappingURL=airhosts-forum.js.map