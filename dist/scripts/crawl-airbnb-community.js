#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const airbnb_community_1 = require("../src/crawlers/airbnb-community");
async function runAirbnbCommunityCrawl() {
    console.log('🚀 Starting Airbnb Community Production Crawl');
    console.log('==============================================');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    try {
        const startTime = Date.now();
        // Run the full crawler
        const stats = await (0, airbnb_community_1.crawlAirbnbCommunity)();
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        console.log('\n✅ Production Crawl Completed!');
        console.log('===============================');
        console.log(`⏱️  Duration: ${duration} seconds (${Math.round(duration / 60)} minutes)`);
        console.log(`📊 Categories discovered: ${stats.categoriesDiscovered}`);
        console.log(`🧵 Threads discovered: ${stats.threadsDiscovered}`);
        console.log(`📝 Posts extracted: ${stats.postsExtracted}`);
        console.log(`💬 Replies extracted: ${stats.repliesExtracted}`);
        console.log(`❌ Errors: ${stats.errors.length}`);
        console.log(`⏭️  Skipped URLs: ${stats.skippedUrls.length}`);
        // Summary
        const totalExtracted = stats.postsExtracted + stats.repliesExtracted;
        console.log(`\n🎯 Total content extracted: ${totalExtracted} items`);
        // Log errors if any
        if (stats.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            stats.errors.slice(0, 10).forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
            if (stats.errors.length > 10) {
                console.log(`  ... and ${stats.errors.length - 10} more errors`);
            }
        }
        // Success/failure determination
        if (totalExtracted > 0) {
            console.log('\n✅ CRAWL SUCCESSFUL - Content was extracted and saved to database');
            process.exit(0);
        }
        else {
            console.log('\n⚠️  CRAWL WARNING - No content was extracted. Check site structure.');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Production crawl failed:', error);
        process.exit(1);
    }
}
// Run the production crawl
runAirbnbCommunityCrawl()
    .catch((error) => {
    console.error('💥 Production crawl crashed:', error);
    process.exit(1);
});
//# sourceMappingURL=crawl-airbnb-community.js.map