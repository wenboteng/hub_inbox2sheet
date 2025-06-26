"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scrape_1 = require("./scrape");
async function testAirbnbCommunityFixed() {
    console.log('🧪 Testing fixed Airbnb Community scraper...');
    try {
        const articles = await (0, scrape_1.scrapeAirbnbCommunity)();
        console.log('\n📊 RESULTS:');
        console.log(`Total articles found: ${articles.length}`);
        // Group by category to see distribution
        const categoryStats = articles.reduce((acc, article) => {
            acc[article.category] = (acc[article.category] || 0) + 1;
            return acc;
        }, {});
        console.log('\nCategory breakdown:');
        Object.entries(categoryStats).forEach(([category, count]) => {
            console.log(`  ${category}: ${count} articles`);
        });
        // Check for duplicate URLs
        const urls = articles.map(a => a.url);
        const uniqueUrls = new Set(urls);
        const duplicateCount = urls.length - uniqueUrls.size;
        console.log(`\nDuplicate check: ${duplicateCount} duplicate URLs found`);
        if (duplicateCount > 0) {
            console.log('\n❌ DUPLICATE URLs FOUND:');
            const urlCounts = urls.reduce((acc, url) => {
                acc[url] = (acc[url] || 0) + 1;
                return acc;
            }, {});
            Object.entries(urlCounts)
                .filter(([_, count]) => count > 1)
                .forEach(([url, count]) => {
                console.log(`  ${url} (${count} times)`);
            });
        }
        else {
            console.log('✅ No duplicate URLs found!');
        }
        // Show sample articles
        console.log('\n📝 Sample articles:');
        articles.slice(0, 3).forEach((article, index) => {
            console.log(`\n${index + 1}. ${article.question}`);
            console.log(`   Category: ${article.category}`);
            console.log(`   URL: ${article.url}`);
            console.log(`   Content length: ${article.answer.length} chars`);
        });
    }
    catch (error) {
        console.error('❌ Test failed:', error);
    }
}
testAirbnbCommunityFixed();
//# sourceMappingURL=test-airbnb-community-fixed.js.map