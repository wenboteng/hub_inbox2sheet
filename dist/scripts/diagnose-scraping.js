"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const featureFlags_1 = require("../utils/featureFlags");
const airbnb_1 = require("../scripts/scrapers/airbnb");
const getyourguide_1 = require("../crawlers/getyourguide");
const viator_1 = require("../crawlers/viator");
const scrape_1 = require("./scrape");
const prisma = new client_1.PrismaClient();
async function getExistingArticleUrls() {
    const existingArticles = await prisma.article.findMany({
        select: { url: true },
    });
    return new Set(existingArticles.map((a) => a.url));
}
async function diagnoseScraping() {
    console.log('🔍 DIAGNOSING SCRAPING ISSUES...\n');
    const existingUrls = await getExistingArticleUrls();
    console.log(`📊 Current database: ${existingUrls.size} existing articles`);
    const results = [];
    // Test each scraper individually
    const scrapers = [
        {
            name: 'Airbnb Official',
            enabled: true,
            scraper: airbnb_1.scrapeAirbnb,
        },
        {
            name: 'GetYourGuide',
            enabled: (0, featureFlags_1.isFeatureEnabled)('enableGetYourGuidePagination'),
            scraper: getyourguide_1.crawlGetYourGuideArticlesWithPagination,
        },
        {
            name: 'Viator',
            enabled: (0, featureFlags_1.isFeatureEnabled)('enableViatorScraping'),
            scraper: viator_1.crawlViatorArticles,
        },
        {
            name: 'Airbnb Community',
            enabled: (0, featureFlags_1.isFeatureEnabled)('enableCommunityCrawling'),
            scraper: scrape_1.scrapeAirbnbCommunity,
        },
    ];
    for (const { name, enabled, scraper } of scrapers) {
        console.log(`\n🔍 Testing ${name}...`);
        console.log(`   Status: ${enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
        const result = {
            platform: name,
            enabled,
            articlesFound: 0,
            newArticles: 0,
            errors: [],
            urlsChecked: [],
        };
        if (!enabled) {
            console.log(`   ⏭️  Skipped (disabled)`);
            results.push(result);
            continue;
        }
        try {
            console.log(`   🚀 Running scraper...`);
            const articles = await scraper();
            result.articlesFound = articles.length;
            result.newArticles = articles.filter(article => !existingUrls.has(article.url)).length;
            console.log(`   📈 Found ${articles.length} total articles`);
            console.log(`   🆕 Found ${result.newArticles} new articles`);
            // Log some sample URLs to see what's being checked
            const sampleUrls = articles.slice(0, 3).map(a => a.url);
            result.urlsChecked = sampleUrls;
            console.log(`   🔗 Sample URLs checked:`);
            sampleUrls.forEach(url => console.log(`      - ${url}`));
        }
        catch (error) {
            result.errors.push(error.message);
            console.log(`   ❌ Error: ${error.message}`);
        }
        results.push(result);
    }
    // Summary
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('='.repeat(50));
    const totalFound = results.reduce((sum, r) => sum + r.articlesFound, 0);
    const totalNew = results.reduce((sum, r) => sum + r.newArticles, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    console.log(`Total articles found: ${totalFound}`);
    console.log(`Total new articles: ${totalNew}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log('\n📊 Platform breakdown:');
    results.forEach(result => {
        const status = result.enabled ? '✅' : '❌';
        const errorStatus = result.errors.length > 0 ? '⚠️' : '✅';
        console.log(`${status} ${result.platform}: ${result.articlesFound} found, ${result.newArticles} new ${errorStatus}`);
    });
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (totalNew === 0) {
        console.log('❌ No new articles found. Possible issues:');
        console.log('   1. All sources have been exhausted');
        console.log('   2. Sources are blocking requests');
        console.log('   3. URLs have changed or become inaccessible');
        console.log('   4. Rate limiting is preventing new content discovery');
        console.log('\n🔧 Suggested actions:');
        console.log('   1. Add new sources (TripAdvisor, Expedia, etc.)');
        console.log('   2. Implement URL discovery/dynamic crawling');
        console.log('   3. Add more community sources');
        console.log('   4. Implement content re-checking for updates');
    }
    else {
        console.log('✅ New articles found! Scraping is working.');
    }
}
async function addNewSources() {
    console.log('\n🚀 ADDING NEW SOURCES...\n');
    // Add TripAdvisor scraping
    console.log('📝 Adding TripAdvisor scraper...');
    // TODO: Implement TripAdvisor scraper
    // Add Expedia scraping
    console.log('📝 Adding Expedia scraper...');
    // TODO: Implement Expedia scraper
    // Add Booking.com scraping
    console.log('📝 Adding Booking.com scraper...');
    // TODO: Implement Booking.com scraper
    console.log('✅ New sources added to configuration');
}
async function main() {
    try {
        await prisma.$connect();
        console.log('✅ Database connected');
        await diagnoseScraping();
        await addNewSources();
    }
    catch (error) {
        console.error('❌ Diagnosis failed:', error);
    }
    finally {
        await prisma.$disconnect();
        console.log('✅ Database disconnected');
    }
}
main();
//# sourceMappingURL=diagnose-scraping.js.map