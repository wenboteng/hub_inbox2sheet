#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const airbnb_community_1 = require("../src/crawlers/airbnb-community");
async function testLimitedCrawl() {
    console.log('🧪 Testing Limited Airbnb Community Crawl');
    console.log('==========================================');
    const crawler = new airbnb_community_1.AirbnbCommunityCrawler();
    try {
        await crawler.initialize();
        const page = await crawler['createPage']();
        // Start from the main community page
        console.log('📄 Loading main community page...');
        await page.goto('https://community.withairbnb.com/t5/Community-Center/ct-p/community-center', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        // Discover categories (but limit to first 3 for testing)
        const categoryUrls = await crawler.testDiscoverCategories(page);
        const limitedCategories = categoryUrls.slice(0, 3);
        console.log(`🔍 Found ${categoryUrls.length} total categories, testing with first ${limitedCategories.length}`);
        await page.close();
        // Test crawling just the first category
        if (limitedCategories.length > 0) {
            console.log(`\n🧵 Testing category: ${limitedCategories[0]}`);
            await crawler.testCrawlCategory(limitedCategories[0]);
        }
        // Get stats
        const stats = crawler.getStats();
        console.log('\n📊 Limited Test Results:');
        console.log('========================');
        console.log(`📝 Posts extracted: ${stats.postsExtracted}`);
        console.log(`💬 Replies extracted: ${stats.repliesExtracted}`);
        console.log(`❌ Errors: ${stats.errors.length}`);
        if (stats.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            stats.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }
        const totalExtracted = stats.postsExtracted + stats.repliesExtracted;
        if (totalExtracted > 0) {
            console.log('\n✅ Limited test PASSED - Content was successfully extracted!');
        }
        else {
            console.log('\n⚠️  Limited test WARNING - No content was extracted.');
        }
    }
    catch (error) {
        console.error('❌ Limited test failed:', error);
    }
    finally {
        await crawler.cleanup();
    }
}
testLimitedCrawl()
    .then(() => {
    console.log('\n🏁 Limited test completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
});
//# sourceMappingURL=test-airbnb-community-limited.js.map