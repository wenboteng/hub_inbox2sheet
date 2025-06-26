"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getyourguide_1 = require("../crawlers/getyourguide");
async function main() {
    try {
        console.log('Starting GetYourGuide crawler test...');
        console.log('Testing with verified help center articles...\n');
        const articles = await (0, getyourguide_1.crawlGetYourGuideArticles)();
        if (articles.length === 0) {
            console.log('❌ No articles were successfully crawled. Check the logs above for details.');
            process.exit(1);
        }
        console.log('\n✅ Successfully crawled articles:');
        articles.forEach((article, index) => {
            console.log(`\n--- Article ${index + 1} ---`);
            console.log('URL:', article.url);
            console.log('Question:', article.question);
            console.log('Answer length:', article.answer.length, 'characters');
            console.log('First 100 chars of answer:', article.answer.substring(0, 100) + '...');
        });
        console.log(`\n✅ Test completed successfully! Crawled ${articles.length} articles.`);
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=test-getyourguide.js.map