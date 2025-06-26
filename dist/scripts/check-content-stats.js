"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkContentStats() {
    console.log('📊 CONTENT COLLECTION STATISTICS');
    console.log('==================================\n');
    try {
        // Total articles
        const totalArticles = await prisma.article.count();
        console.log(`📈 Total Articles: ${totalArticles.toLocaleString()}`);
        // Articles by platform
        console.log('\n🏢 Articles by Platform:');
        const platformStats = await prisma.article.groupBy({
            by: ['platform'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        });
        platformStats.forEach(stat => {
            console.log(`   ${stat.platform}: ${stat._count.id.toLocaleString()} articles`);
        });
        // Articles by source
        console.log('\n📚 Articles by Source:');
        const sourceStats = await prisma.article.groupBy({
            by: ['source'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        });
        sourceStats.forEach(stat => {
            console.log(`   ${stat.source}: ${stat._count.id.toLocaleString()} articles`);
        });
        // Articles by content type
        console.log('\n📝 Articles by Content Type:');
        const contentTypeStats = await prisma.article.groupBy({
            by: ['contentType'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        });
        contentTypeStats.forEach(stat => {
            console.log(`   ${stat.contentType}: ${stat._count.id.toLocaleString()} articles`);
        });
        // Articles by language
        console.log('\n🌍 Articles by Language:');
        const languageStats = await prisma.article.groupBy({
            by: ['language'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        });
        languageStats.forEach(stat => {
            console.log(`   ${stat.language}: ${stat._count.id.toLocaleString()} articles`);
        });
        // Top categories
        console.log('\n🏷️  Top Categories:');
        const categoryStats = await prisma.article.groupBy({
            by: ['category'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
        });
        categoryStats.forEach(stat => {
            console.log(`   ${stat.category}: ${stat._count.id.toLocaleString()} articles`);
        });
        // Recent articles (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentArticles = await prisma.article.count({
            where: {
                createdAt: {
                    gte: sevenDaysAgo
                }
            }
        });
        console.log(`\n📅 Recent Articles (Last 7 days): ${recentArticles.toLocaleString()}`);
        // Articles added today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayArticles = await prisma.article.count({
            where: {
                createdAt: {
                    gte: today
                }
            }
        });
        console.log(`📅 Articles Added Today: ${todayArticles.toLocaleString()}`);
        // Articles with embeddings
        const articlesWithEmbeddings = await prisma.article.count({
            where: {
                paragraphs: {
                    some: {}
                }
            }
        });
        console.log(`\n🧠 Articles with Embeddings: ${articlesWithEmbeddings.toLocaleString()}`);
        // Duplicate articles
        const duplicateArticles = await prisma.article.count({
            where: {
                isDuplicate: true
            }
        });
        console.log(`🔄 Duplicate Articles: ${duplicateArticles.toLocaleString()}`);
        // Sample of recent articles
        console.log('\n📋 Sample of Recent Articles:');
        const recentSample = await prisma.article.findMany({
            select: {
                question: true,
                platform: true,
                source: true,
                contentType: true,
                createdAt: true,
                url: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5
        });
        recentSample.forEach((article, index) => {
            console.log(`   ${index + 1}. ${article.question}`);
            console.log(`      Platform: ${article.platform} | Source: ${article.source} | Type: ${article.contentType}`);
            console.log(`      Added: ${article.createdAt.toLocaleDateString()}`);
            console.log(`      URL: ${article.url}`);
            console.log('');
        });
        // Articles by crawl status
        console.log('\n🔄 Articles by Crawl Status:');
        const statusStats = await prisma.article.groupBy({
            by: ['crawlStatus'],
            _count: { id: true }
        });
        statusStats.forEach(stat => {
            console.log(`   ${stat.crawlStatus}: ${stat._count.id.toLocaleString()} articles`);
        });
        // Check for high-priority news articles
        console.log('\n📰 High-Priority News Articles:');
        const highPriorityNews = await prisma.article.findMany({
            where: {
                category: {
                    contains: '[HIGH]'
                }
            },
            select: {
                question: true,
                platform: true,
                category: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        console.log(`   Found ${highPriorityNews.length} high-priority news articles:`);
        highPriorityNews.forEach(article => {
            console.log(`   - ${article.question} (${article.platform})`);
        });
    }
    catch (error) {
        console.error('❌ Error checking content stats:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkContentStats();
//# sourceMappingURL=check-content-stats.js.map