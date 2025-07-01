#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const airbnb_community_1 = require("../src/crawlers/airbnb-community");
async function testAirbnbCommunityCrawler() {
    console.log('🚀 Starting Airbnb Community Crawler Test');
    console.log('==========================================');
    try {
        const startTime = Date.now();
        // Run the crawler
        const stats = await (0, airbnb_community_1.crawlAirbnbCommunity)();
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        console.log('\n✅ Crawl completed successfully!');
        console.log('================================');
        console.log(`⏱️  Duration: ${duration} seconds`);
        console.log(`📊 Categories discovered: ${stats.categoriesDiscovered}`);
        console.log(`🧵 Threads discovered: ${stats.threadsDiscovered}`);
        console.log(`📝 Posts extracted: ${stats.postsExtracted}`);
        console.log(`💬 Replies extracted: ${stats.repliesExtracted}`);
        console.log(`❌ Errors: ${stats.errors.length}`);
        console.log(`⏭️  Skipped URLs: ${stats.skippedUrls.length}`);
        if (stats.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            stats.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }
        if (stats.skippedUrls.length > 0) {
            console.log('\n⏭️  Skipped URLs:');
            stats.skippedUrls.forEach((url, index) => {
                console.log(`  ${index + 1}. ${url}`);
            });
        }
        // Summary
        const totalExtracted = stats.postsExtracted + stats.repliesExtracted;
        console.log(`\n🎯 Total content extracted: ${totalExtracted} items`);
        if (totalExtracted > 0) {
            console.log('✅ Test PASSED - Content was successfully extracted and saved to database');
        }
        else {
            console.log('⚠️  Test WARNING - No content was extracted. Check selectors and site structure.');
        }
    }
    catch (error) {
        console.error('❌ Test FAILED:', error);
        process.exit(1);
    }
}
// Run the test
testAirbnbCommunityCrawler()
    .then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
});
//# sourceMappingURL=test-airbnb-community-crawler.js.map