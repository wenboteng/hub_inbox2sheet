"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testImprovedScraping = testImprovedScraping;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function testImprovedScraping() {
    console.log('🧪 Testing Improved Scraping Logic');
    console.log('===================================');
    try {
        await prisma.$connect();
        console.log('✅ Database connected');
        // Get current statistics
        const totalArticles = await prisma.article.count();
        const officialArticles = await prisma.article.count({
            where: { contentType: 'official' }
        });
        const communityArticles = await prisma.article.count({
            where: { contentType: 'community' }
        });
        const platformStats = await prisma.article.groupBy({
            by: ['platform'],
            _count: { id: true }
        });
        console.log('\n📊 CURRENT DATABASE STATISTICS:');
        console.log(`Total articles: ${totalArticles}`);
        console.log(`Official articles: ${officialArticles}`);
        console.log(`Community articles: ${communityArticles}`);
        console.log('\nPlatform breakdown:');
        platformStats.forEach((stat) => {
            console.log(`  ${stat.platform}: ${stat._count.id} articles`);
        });
        // Check for duplicates
        console.log('\n🔍 CHECKING FOR DUPLICATES:');
        const duplicateUrls = await prisma.$queryRaw `
      SELECT url, COUNT(*) as count 
      FROM "Article" 
      GROUP BY url 
      HAVING COUNT(*) > 1
    `;
        if (Array.isArray(duplicateUrls) && duplicateUrls.length > 0) {
            console.log('❌ Found duplicate URLs:');
            duplicateUrls.forEach((duplicate) => {
                console.log(`  ${duplicate.url}: ${duplicate.count} times`);
            });
        }
        else {
            console.log('✅ No duplicate URLs found');
        }
        // Check recent articles
        console.log('\n📅 RECENT ARTICLES (last 10):');
        const recentArticles = await prisma.article.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                url: true,
                question: true,
                platform: true,
                contentType: true,
                createdAt: true
            }
        });
        recentArticles.forEach((article, index) => {
            console.log(`${index + 1}. [${article.platform}] ${article.question.substring(0, 50)}...`);
            console.log(`   URL: ${article.url}`);
            console.log(`   Type: ${article.contentType}`);
            console.log(`   Created: ${article.createdAt.toISOString()}`);
            console.log('');
        });
        console.log('✅ Database analysis completed');
    }
    catch (error) {
        console.error('❌ Error during analysis:', error);
    }
    finally {
        await prisma.$disconnect();
        console.log('🔌 Database disconnected');
    }
}
// Run the test if this file is executed directly
if (require.main === module) {
    testImprovedScraping()
        .then(() => {
        console.log('\n🎉 Analysis completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Analysis failed:', error);
        process.exit(1);
    });
}
