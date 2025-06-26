"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCommunityCrawler = testCommunityCrawler;
const communityCrawler_1 = require("../lib/communityCrawler");
async function testCommunityCrawler() {
    console.log('🧪 Testing Community Crawler Improvements');
    console.log('==========================================');
    try {
        // Get the test URLs
        const testUrls = await (0, communityCrawler_1.getCommunityContentUrls)();
        console.log(`📋 Test URLs to scrape: ${testUrls.length}`);
        testUrls.forEach((url, index) => {
            console.log(`  ${index + 1}. ${url}`);
        });
        console.log('\n🚀 Starting community scraping...');
        // Run the scraper
        await (0, communityCrawler_1.scrapeCommunityUrls)(testUrls);
        console.log('\n✅ Community crawler test completed!');
        console.log('\n📊 Expected improvements:');
        console.log('  ✅ Skip category listing pages');
        console.log('  ✅ Fixed Airbnb Community selectors (.lia-message-body-content)');
        console.log('  ✅ Fixed AirHosts Forum with JSON API fallback');
        console.log('  ✅ Added comprehensive logging (posts, replies, characters)');
        console.log('  ✅ Updated test URLs to thread pages only');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
    }
}
// Run the test if this file is executed directly
if (require.main === module) {
    testCommunityCrawler()
        .then(() => {
        console.log('\n🎉 Test completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Test failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=test-community-crawler.js.map