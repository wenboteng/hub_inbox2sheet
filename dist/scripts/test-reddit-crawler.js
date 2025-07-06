"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reddit_1 = require("../src/crawlers/reddit");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function testRedditCrawler() {
    console.log('🚀 TESTING REDDIT CRAWLER');
    console.log('==========================\n');
    try {
        // Get current Reddit article count
        const currentCount = await prisma.article.count({
            where: { platform: 'Reddit' }
        });
        console.log(`📊 Current Reddit articles in database: ${currentCount.toLocaleString()}`);
        console.log('');
        // Run the Reddit crawler
        console.log('🔄 Starting Reddit crawl...');
        console.log('   - Target subreddits: travel, solotravel, backpacking, digitalnomad, travelhacks, travelpartners, travelphotos, traveldeals, traveling, wanderlust');
        console.log('   - Rate limiting: 50 requests/minute (conservative)');
        console.log('   - Time filter: last month');
        console.log('   - Sort by: hot posts');
        console.log('   - Min score: 5 upvotes');
        console.log('   - Min comments: 3');
        console.log('   - Max posts per subreddit: 100');
        console.log('   - Max comments per post: 50');
        console.log('');
        const startTime = Date.now();
        const stats = await (0, reddit_1.crawlReddit)();
        const duration = Date.now() - startTime;
        // Get new count
        const newCount = await prisma.article.count({
            where: { platform: 'Reddit' }
        });
        console.log('\n📈 REDDIT CRAWL RESULTS');
        console.log('=======================');
        console.log(`Duration: ${(duration / 1000 / 60).toFixed(1)} minutes`);
        console.log(`Subreddits processed: ${stats.subredditsProcessed}`);
        console.log(`Posts discovered: ${stats.postsDiscovered}`);
        console.log(`Posts extracted: ${stats.postsExtracted}`);
        console.log(`Comments extracted: ${stats.commentsExtracted}`);
        console.log(`Total new content: ${stats.postsExtracted + stats.commentsExtracted}`);
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
        // Show recent articles
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
            }
        });
        console.log('🆕 RECENTLY ADDED REDDIT ARTICLES');
        console.log('==================================');
        recentArticles.forEach((article, index) => {
            console.log(`${index + 1}. ${article.question}`);
            console.log(`   Category: ${article.category}`);
            console.log(`   Author: ${article.author || 'Unknown'}`);
            console.log(`   Content length: ${article.answer.length} characters`);
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
        console.log('\n✅ Reddit crawler test completed!');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the test
testRedditCrawler();
//# sourceMappingURL=test-reddit-crawler.js.map