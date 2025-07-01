#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const communityCrawler_1 = require("../src/lib/communityCrawler");
const TEST_URLS = [
    'https://community.withairbnb.com/t5/Hosting/When-does-Airbnb-pay-hosts/td-p/184758',
    // Add a few more test URLs to verify the scraper works
    'https://community.withairbnb.com/t5/Hosting/How-to-handle-cancellations/td-p/123456',
];
async function testImprovedAirbnbScraper() {
    console.log('🧪 Testing Improved Airbnb Community Scraper');
    console.log('=============================================');
    for (const url of TEST_URLS) {
        console.log(`\n🔍 Testing URL: ${url}`);
        console.log('---------------------------------------------');
        try {
            await (0, communityCrawler_1.scrapeCommunityUrls)([url]);
            console.log(`✅ Successfully processed: ${url}`);
        }
        catch (error) {
            console.error(`❌ Error processing ${url}:`, error.message);
        }
    }
    console.log('\n✅ Test completed!');
}
testImprovedAirbnbScraper();
//# sourceMappingURL=test-improved-airbnb.js.map