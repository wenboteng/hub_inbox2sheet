"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const airbnb_1 = require("../crawlers/airbnb");
async function main() {
    console.log('Starting Airbnb crawler test...');
    console.log('Testing with verified help center articles...\n');
    try {
        const articles = await (0, airbnb_1.crawlAirbnbArticles)();
        console.log('\n✅ Test completed successfully! Crawled', articles.length, 'articles.');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}
main();
