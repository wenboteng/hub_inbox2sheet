"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reddit_enhanced_1 = require("../src/crawlers/reddit-enhanced");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function testEnhancedRedditCrawler() {
    console.log('🚀 TESTING ENHANCED REDDIT CRAWLER');
    console.log('===================================\n');
    try {
        // Get current Reddit article count
        const currentCount = await prisma.article.count({
            where: { platform: 'Reddit' }
        });
        console.log(`📊 Current Reddit articles in database: ${currentCount.toLocaleString()}`);
        console.log('');
        // Run the enhanced Reddit crawler
        console.log('🔄 Starting enhanced Reddit crawl...');
        console.log('   - Target subreddits: travel, solotravel, backpacking, digitalnomad, travelhacks, travelpartners, travelphotos, traveldeals, traveling, wanderlust');
        console.log('   - Enhanced rate limiting with retry logic');
        console.log('   - Quality filtering: min 100 chars, min score 5');
        console.log('   - Comment depth limiting (max 3 levels)');
        console.log('   - Better error handling and recovery');
        console.log('   - Content quality validation');
        console.log('   - Upvote ratio tracking');
        console.log('');
        const startTime = Date.now();
        const stats = await (0, reddit_enhanced_1.crawlRedditEnhanced)();
        const duration = Date.now() - startTime;
        // Get new count
        const newCount = await prisma.article.count({
            where: { platform: 'Reddit' }
        });
        console.log('\n📈 ENHANCED REDDIT CRAWL RESULTS');
        console.log('=================================');
        console.log(`Duration: ${(duration / 1000 / 60).toFixed(1)} minutes`);
        console.log(`Subreddits processed: ${stats.subredditsProcessed}`);
        console.log(`Posts discovered: ${stats.postsDiscovered}`);
        console.log(`Posts extracted: ${stats.postsExtracted}`);
        console.log(`Comments extracted: ${stats.commentsExtracted}`);
        console.log(`Total new content: ${stats.postsExtracted + stats.commentsExtracted}`);
        console.log(`Total requests made: ${stats.totalRequests}`);
        console.log(`Rate limit hits: ${stats.rateLimitHits}`);
        console.log(`Errors: ${stats.errors.length}`);
        console.log(`Skipped posts: ${stats.skippedPosts.length}`);
        console.log(`Success rate: ${stats.errors.length > 0 ? ((stats.postsExtracted + stats.commentsExtracted) / (stats.postsExtracted + stats.commentsExtracted + stats.errors.length) * 100).toFixed(1) : '100'}%`);
        console.log('');
        console.log('📊 DATABASE IMPACT');
        console.log('==================');
        console.log(`Before: ${currentCount.toLocaleString()} Reddit articles`);
        console.log(`After: ${newCount.toLocaleString()} Reddit articles`);
        console.log(`Growth: +${(newCount - currentCount).toLocaleString()} articles`);
        console.log(`Growth percentage: +${currentCount > 0 ? Math.round(((newCount - currentCount) / currentCount) * 100) : 0}%`);
        console.log('');
        // Show recent articles with enhanced details
        const recentArticles = await prisma.article.findMany({
            where: { platform: 'Reddit' },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                question: true,
                category: true,
                createdAt: true,
                answer: true,
                author: true,
                url: true,
            }
        });
        console.log('🆕 RECENTLY ADDED REDDIT ARTICLES');
        console.log('==================================');
        recentArticles.forEach((article, index) => {
            console.log(`${index + 1}. ${article.question}`);
            console.log(`   Category: ${article.category}`);
            console.log(`   Author: ${article.author || 'Unknown'}`);
            console.log(`   Content length: ${article.answer.length} characters`);
            console.log(`   URL: ${article.url}`);
            console.log(`   Added: ${article.createdAt.toLocaleString()}`);
            console.log('');
        });
        // Show subreddit breakdown
        const subredditBreakdown = await prisma.article.groupBy({
            by: ['category'],
            where: { platform: 'Reddit' },
            _count: { category: true }
        });
        console.log('📂 SUBREDDIT BREAKDOWN');
        console.log('=======================');
        subredditBreakdown.forEach(item => {
            console.log(`${item.category}: ${item._count.category.toLocaleString()} articles`);
        });
        // Show language breakdown
        const languageBreakdown = await prisma.article.groupBy({
            by: ['language'],
            where: { platform: 'Reddit' },
            _count: { language: true }
        });
        console.log('\n🌍 LANGUAGE BREAKDOWN');
        console.log('=====================');
        languageBreakdown.forEach(item => {
            console.log(`${item.language}: ${item._count.language.toLocaleString()} articles`);
        });
        // Show content type breakdown
        const contentTypeBreakdown = await prisma.article.groupBy({
            by: ['contentType'],
            where: { platform: 'Reddit' },
            _count: { contentType: true }
        });
        console.log('\n📝 CONTENT TYPE BREAKDOWN');
        console.log('=========================');
        contentTypeBreakdown.forEach(item => {
            console.log(`${item.contentType}: ${item._count.contentType.toLocaleString()} articles`);
        });
        // Performance metrics
        console.log('\n⚡ PERFORMANCE METRICS');
        console.log('======================');
        console.log(`Average requests per minute: ${(stats.totalRequests / (duration / 1000 / 60)).toFixed(1)}`);
        console.log(`Rate limit efficiency: ${stats.rateLimitHits > 0 ? ((stats.totalRequests - stats.rateLimitHits) / stats.totalRequests * 100).toFixed(1) : '100'}%`);
        console.log(`Content extraction rate: ${((stats.postsExtracted + stats.commentsExtracted) / (duration / 1000 / 60)).toFixed(1)} items/minute`);
        if (stats.errors.length > 0) {
            console.log('\n❌ TOP ERRORS:');
            console.log('===============');
            stats.errors.slice(0, 5).forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }
        console.log('\n✅ Enhanced Reddit crawler test completed!');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the test
testEnhancedRedditCrawler();
//# sourceMappingURL=test-reddit-enhanced.js.map