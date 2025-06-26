"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const expedia_1 = require("../crawlers/expedia");
const news_policy_1 = require("../crawlers/news-policy");
const prisma = new client_1.PrismaClient();
async function testImprovedCrawling() {
    console.log('🧪 TESTING IMPROVED CRAWLING SYSTEM');
    console.log('=====================================\n');
    try {
        // Get initial count
        const initialCount = await prisma.article.count();
        console.log(`📊 Initial article count: ${initialCount}`);
        // Test 1: Expedia Crawler (Fixed URLs)
        console.log('\n🔧 TEST 1: EXPEDIA CRAWLER');
        console.log('==========================');
        try {
            const expediaArticles = await (0, expedia_1.crawlExpedia)();
            console.log(`✅ Expedia crawler completed: ${expediaArticles.length} articles found`);
        }
        catch (error) {
            console.log(`❌ Expedia crawler failed: ${error.message}`);
        }
        // Test 2: News and Policy Crawler (Improved)
        console.log('\n📰 TEST 2: NEWS AND POLICY CRAWLER');
        console.log('===================================');
        try {
            const newsArticles = await (0, news_policy_1.crawlNewsAndPolicies)();
            console.log(`✅ News crawler completed: ${newsArticles.length} articles found`);
        }
        catch (error) {
            console.log(`❌ News crawler failed: ${error.message}`);
        }
        // Get final count
        const finalCount = await prisma.article.count();
        const newArticles = finalCount - initialCount;
        console.log('\n📈 RESULTS SUMMARY');
        console.log('==================');
        console.log(`📊 Initial articles: ${initialCount}`);
        console.log(`📊 Final articles: ${finalCount}`);
        console.log(`📊 New articles added: ${newArticles}`);
        if (newArticles > 0) {
            console.log('✅ SUCCESS: Content collection increased!');
            // Show some of the new articles
            console.log('\n📋 Sample of New Articles:');
            const newArticlesList = await prisma.article.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5
            });
            newArticlesList.forEach((article, index) => {
                console.log(`   ${index + 1}. ${article.question}`);
                console.log(`      Platform: ${article.platform} | Source: ${article.source} | Type: ${article.contentType}`);
                console.log(`      Category: ${article.category}`);
                console.log('');
            });
        }
        else {
            console.log('⚠️  No new articles were added');
            // Check for any errors or issues
            console.log('\n🔍 DIAGNOSING ISSUES:');
            // Check if there are any articles with errors
            const errorArticles = await prisma.article.findMany({
                where: {
                    crawlStatus: 'error'
                }
            });
            if (errorArticles.length > 0) {
                console.log(`   Found ${errorArticles.length} articles with error status`);
            }
            // Check recent crawl jobs
            const recentJobs = await prisma.crawlJob.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5
            });
            if (recentJobs.length > 0) {
                console.log('   Recent crawl jobs:');
                recentJobs.forEach(job => {
                    console.log(`     - ${job.source}: ${job.status} (${job.error || 'no error'})`);
                });
            }
        }
    }
    catch (error) {
        console.error('❌ Test failed:', error.message);
    }
    finally {
        await prisma.$disconnect();
    }
}
testImprovedCrawling();
//# sourceMappingURL=test-improved-crawling.js.map