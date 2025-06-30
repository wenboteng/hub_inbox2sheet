"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const comprehensive_discovery_1 = require("./comprehensive-discovery");
async function testNewSources() {
    console.log('[TEST] Starting focused test of new content sources...');
    try {
        // Test TripAdvisor
        console.log('\n[TEST] === TESTING TRIPADVISOR ===');
        const tripAdvisorArticles = await (0, comprehensive_discovery_1.scrapeTripAdvisor)();
        console.log(`[TEST] TripAdvisor: Found ${tripAdvisorArticles.length} articles`);
        tripAdvisorArticles.forEach(article => {
            console.log(`[TEST] - ${article.question} (${article.answer.length} chars)`);
        });
        // Test Booking.com
        console.log('\n[TEST] === TESTING BOOKING.COM ===');
        const bookingArticles = await (0, comprehensive_discovery_1.scrapeBooking)();
        console.log(`[TEST] Booking.com: Found ${bookingArticles.length} articles`);
        bookingArticles.forEach(article => {
            console.log(`[TEST] - ${article.question} (${article.answer.length} chars)`);
        });
        // Test Quora
        console.log('\n[TEST] === TESTING QUORA ===');
        const quoraArticles = await (0, comprehensive_discovery_1.scrapeQuora)();
        console.log(`[TEST] Quora: Found ${quoraArticles.length} articles`);
        quoraArticles.forEach(article => {
            console.log(`[TEST] - ${article.question} (${article.answer.length} chars)`);
        });
        console.log('\n[TEST] === SUMMARY ===');
        console.log(`[TEST] Total articles found: ${tripAdvisorArticles.length + bookingArticles.length + quoraArticles.length}`);
        console.log(`[TEST] - TripAdvisor: ${tripAdvisorArticles.length}`);
        console.log(`[TEST] - Booking.com: ${bookingArticles.length}`);
        console.log(`[TEST] - Quora: ${quoraArticles.length}`);
    }
    catch (error) {
        console.error('[TEST] Error during testing:', error);
    }
}
testNewSources();
//# sourceMappingURL=test-new-sources.js.map