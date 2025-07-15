"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkContentStats() {
    console.log('📊 CONTENT DATABASE ANALYSIS');
    console.log('===========================\n');
    try {
        // Connect to database
        await prisma.$connect();
        console.log('✅ Database connected successfully\n');
        // 1. Total content statistics
        console.log('1️⃣ TOTAL CONTENT STATISTICS');
        console.log('----------------------------');
        const totalArticles = await prisma.article.count();
        console.log(`📚 Total Articles: ${totalArticles.toLocaleString()}`);
        const totalAnswers = await prisma.answer.count();
        console.log(`💬 Total Answers: ${totalAnswers.toLocaleString()}`);
        const totalContent = totalArticles + totalAnswers;
        console.log(`📈 Total Content Items: ${totalContent.toLocaleString()}\n`);
        // 2. Content by platform
        console.log('2️⃣ CONTENT BY PLATFORM');
        console.log('----------------------');
        const platformStats = await prisma.article.groupBy({
            by: ['platform'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        });
        platformStats.forEach(stat => {
            console.log(`🏢 ${stat.platform}: ${stat._count.id.toLocaleString()} articles`);
        });
        console.log();
        // 3. Content by type
        console.log('3️⃣ CONTENT BY TYPE');
        console.log('------------------');
        const contentTypeStats = await prisma.article.groupBy({
            by: ['contentType'],
            _count: { id: true }
        });
        contentTypeStats.forEach(stat => {
            console.log(`📝 ${stat.contentType}: ${stat._count.id.toLocaleString()} articles`);
        });
        console.log();
        // 4. Recent content (last 24 hours)
        console.log('4️⃣ RECENT CONTENT (LAST 24 HOURS)');
        console.log('----------------------------------');
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentArticles = await prisma.article.count({
            where: {
                createdAt: {
                    gte: twentyFourHoursAgo
                }
            }
        });
        const recentAnswers = await prisma.answer.count({
            where: {
                createdAt: {
                    gte: twentyFourHoursAgo
                }
            }
        });
        console.log(`🆕 New Articles (24h): ${recentArticles.toLocaleString()}`);
        console.log(`🆕 New Answers (24h): ${recentAnswers.toLocaleString()}`);
        console.log(`🆕 Total New Content (24h): ${(recentArticles + recentAnswers).toLocaleString()}\n`);
        // 5. Recent content by platform
        console.log('5️⃣ RECENT CONTENT BY PLATFORM (24H)');
        console.log('------------------------------------');
        const recentPlatformStats = await prisma.article.groupBy({
            by: ['platform'],
            _count: { id: true },
            where: {
                createdAt: {
                    gte: twentyFourHoursAgo
                }
            },
            orderBy: { _count: { id: 'desc' } }
        });
        if (recentPlatformStats.length === 0) {
            console.log('📭 No new content in the last 24 hours');
        }
        else {
            recentPlatformStats.forEach(stat => {
                console.log(`🏢 ${stat.platform}: ${stat._count.id.toLocaleString()} new articles`);
            });
        }
        console.log();
        // 6. Content growth rate
        console.log('6️⃣ CONTENT GROWTH ANALYSIS');
        console.log('---------------------------');
        // Last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const lastWeekArticles = await prisma.article.count({
            where: {
                createdAt: {
                    gte: sevenDaysAgo
                }
            }
        });
        // Last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const lastMonthArticles = await prisma.article.count({
            where: {
                createdAt: {
                    gte: thirtyDaysAgo
                }
            }
        });
        console.log(`📅 Last 7 days: ${lastWeekArticles.toLocaleString()} articles`);
        console.log(`📅 Last 30 days: ${lastMonthArticles.toLocaleString()} articles`);
        const dailyAverage7Days = (lastWeekArticles / 7).toFixed(1);
        const dailyAverage30Days = (lastMonthArticles / 30).toFixed(1);
        console.log(`📊 Daily average (7 days): ${dailyAverage7Days} articles/day`);
        console.log(`📊 Daily average (30 days): ${dailyAverage30Days} articles/day\n`);
        // 7. Latest content samples
        console.log('7️⃣ LATEST CONTENT SAMPLES');
        console.log('-------------------------');
        const latestArticles = await prisma.article.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                platform: true,
                question: true,
                createdAt: true,
                contentType: true
            }
        });
        if (latestArticles.length === 0) {
            console.log('📭 No articles found in database');
        }
        else {
            latestArticles.forEach((article, index) => {
                const timeAgo = getTimeAgo(article.createdAt);
                console.log(`${index + 1}. [${article.platform}] ${article.question.substring(0, 60)}...`);
                console.log(`   📅 ${timeAgo} | 📝 ${article.contentType}`);
            });
        }
        console.log();
        // 8. Database health check
        console.log('8️⃣ DATABASE HEALTH CHECK');
        console.log('------------------------');
        const oldestArticle = await prisma.article.findFirst({
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true, platform: true }
        });
        if (oldestArticle) {
            const daysSinceFirst = Math.floor((Date.now() - oldestArticle.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            console.log(`📅 Database age: ${daysSinceFirst} days`);
            console.log(`🏢 First platform: ${oldestArticle.platform}`);
        }
        const duplicateUrls = await prisma.article.groupBy({
            by: ['url'],
            _count: { id: true },
            having: {
                id: {
                    _count: {
                        gt: 1
                    }
                }
            }
        });
        console.log(`🔍 Duplicate URLs: ${duplicateUrls.length}`);
        console.log(`✅ Database health: ${duplicateUrls.length === 0 ? 'Good' : 'Needs attention'}`);
    }
    catch (error) {
        console.error('❌ Error analyzing database:', error);
    }
    finally {
        await prisma.$disconnect();
        console.log('\n🔌 Database disconnected');
    }
}
// Helper function to get time ago
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 60) {
        return `${diffMins} minutes ago`;
    }
    else if (diffHours < 24) {
        return `${diffHours} hours ago`;
    }
    else {
        return `${diffDays} days ago`;
    }
}
// Run the analysis
checkContentStats().catch(console.error);
//# sourceMappingURL=check-content-stats.js.map