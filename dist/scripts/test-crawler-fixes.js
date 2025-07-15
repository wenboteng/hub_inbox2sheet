"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const viator_1 = require("../src/crawlers/viator");
const stackoverflow_1 = require("../src/crawlers/stackoverflow");
const airhosts_forum_1 = require("../src/crawlers/airhosts-forum");
async function testCrawlerFixes() {
    console.log('🧪 TESTING CRAWLER FIXES');
    console.log('========================\n');
    // Test 1: Viator Crawler (403 errors fix)
    console.log('1️⃣ Testing Viator Crawler (403 errors fix)...');
    try {
        const viatorArticles = await (0, viator_1.crawlViatorArticles)();
        console.log(`✅ Viator: Found ${viatorArticles.length} articles`);
        if (viatorArticles.length > 0) {
            console.log(`   Sample article: "${viatorArticles[0].question}"`);
        }
    }
    catch (error) {
        console.error(`❌ Viator test failed:`, error);
    }
    console.log('\n' + '='.repeat(50) + '\n');
    // Test 2: Stack Overflow Crawler (rate limiting fix)
    console.log('2️⃣ Testing Stack Overflow Crawler (rate limiting fix)...');
    try {
        const stackOverflowPosts = await (0, stackoverflow_1.crawlStackOverflow)();
        console.log(`✅ Stack Overflow: Found ${stackOverflowPosts.length} posts`);
        if (stackOverflowPosts.length > 0) {
            console.log(`   Sample post: "${stackOverflowPosts[0].question}"`);
        }
    }
    catch (error) {
        console.error(`❌ Stack Overflow test failed:`, error);
    }
    console.log('\n' + '='.repeat(50) + '\n');
    // Test 3: AirHosts Forum Crawler (timeout fix)
    console.log('3️⃣ Testing AirHosts Forum Crawler (timeout fix)...');
    try {
        const airHostsPosts = await (0, airhosts_forum_1.crawlAirHostsForum)();
        console.log(`✅ AirHosts Forum: Found ${airHostsPosts.length} posts`);
        if (airHostsPosts.length > 0) {
            console.log(`   Sample post: "${airHostsPosts[0].question}"`);
        }
    }
    catch (error) {
        console.error(`❌ AirHosts Forum test failed:`, error);
    }
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Crawler fix testing completed!');
}
// Run the test
testCrawlerFixes().catch(console.error);
//# sourceMappingURL=test-crawler-fixes.js.map