"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function getTimeAgo(date) {
    const now = Date.now();
    const diff = now - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    else {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
}
async function check24HourContent() {
    console.log('🕐 24-HOUR CONTENT ANALYSIS');
    console.log('===========================\n');
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully\n');
        // Calculate time ranges
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        // 1. OVERALL STATISTICS
        console.log('1️⃣ OVERALL CONTENT STATISTICS');
        console.log('=============================');
        const totalArticles = await prisma.article.count();
        const totalAnswers = await prisma.answer.count();
        const totalReports = await prisma.report.count();
        const totalQuestions = await prisma.submittedQuestion.count();
        console.log(`📚 Total Articles: ${totalArticles.toLocaleString()}`);
        console.log(`💬 Total Answers: ${totalAnswers.toLocaleString()}`);
        console.log(`📋 Total Reports: ${totalReports.toLocaleString()}`);
        console.log(`❓ Total Questions: ${totalQuestions.toLocaleString()}`);
        console.log(`📈 Total Content Items: ${(totalArticles + totalAnswers + totalReports + totalQuestions).toLocaleString()}\n`);
        // 2. 24-HOUR CONTENT BREAKDOWN
        console.log('2️⃣ 24-HOUR CONTENT BREAKDOWN');
        console.log('============================');
        const articles24h = await prisma.article.count({
            where: { createdAt: { gte: twentyFourHoursAgo } }
        });
        const answers24h = await prisma.answer.count({
            where: { createdAt: { gte: twentyFourHoursAgo } }
        });
        const reports24h = await prisma.report.count({
            where: { createdAt: { gte: twentyFourHoursAgo } }
        });
        const questions24h = await prisma.submittedQuestion.count({
            where: { createdAt: { gte: twentyFourHoursAgo } }
        });
        console.log(`🆕 New Articles (24h): ${articles24h.toLocaleString()}`);
        console.log(`🆕 New Answers (24h): ${answers24h.toLocaleString()}`);
        console.log(`🆕 New Reports (24h): ${reports24h.toLocaleString()}`);
        console.log(`🆕 New Questions (24h): ${questions24h.toLocaleString()}`);
        console.log(`🆕 Total New Content (24h): ${(articles24h + answers24h + reports24h + questions24h).toLocaleString()}\n`);
        // 3. HOURLY BREAKDOWN
        console.log('3️⃣ HOURLY CONTENT BREAKDOWN');
        console.log('===========================');
        const articles1h = await prisma.article.count({
            where: { createdAt: { gte: oneHourAgo } }
        });
        const articles6h = await prisma.article.count({
            where: { createdAt: { gte: sixHoursAgo } }
        });
        const articles12h = await prisma.article.count({
            where: { createdAt: { gte: twelveHoursAgo } }
        });
        console.log(`⏰ Last 1 hour: ${articles1h} articles`);
        console.log(`⏰ Last 6 hours: ${articles6h} articles`);
        console.log(`⏰ Last 12 hours: ${articles12h} articles`);
        console.log(`⏰ Last 24 hours: ${articles24h} articles\n`);
        // 4. PLATFORM BREAKDOWN (24H)
        console.log('4️⃣ PLATFORM BREAKDOWN (24H)');
        console.log('===========================');
        const platformStats24h = await prisma.article.groupBy({
            by: ['platform'],
            _count: { id: true },
            where: { createdAt: { gte: twentyFourHoursAgo } },
            orderBy: { _count: { id: 'desc' } }
        });
        if (platformStats24h.length === 0) {
            console.log('📭 No new content in the last 24 hours');
        }
        else {
            platformStats24h.forEach(stat => {
                console.log(`🏢 ${stat.platform}: ${stat._count.id.toLocaleString()} articles`);
            });
        }
        console.log();
        // 5. CONTENT TYPE BREAKDOWN (24H)
        console.log('5️⃣ CONTENT TYPE BREAKDOWN (24H)');
        console.log('================================');
        const contentTypeStats24h = await prisma.article.groupBy({
            by: ['contentType'],
            _count: { id: true },
            where: { createdAt: { gte: twentyFourHoursAgo } },
            orderBy: { _count: { id: 'desc' } }
        });
        if (contentTypeStats24h.length === 0) {
            console.log('📭 No new content in the last 24 hours');
        }
        else {
            contentTypeStats24h.forEach(stat => {
                console.log(`📝 ${stat.contentType}: ${stat._count.id.toLocaleString()} articles`);
            });
        }
        console.log();
        // 6. DETAILED 24H CONTENT LIST
        console.log('6️⃣ DETAILED 24H CONTENT LIST');
        console.log('=============================');
        const recentArticles = await prisma.article.findMany({
            where: { createdAt: { gte: twentyFourHoursAgo } },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                question: true,
                platform: true,
                category: true,
                contentType: true,
                source: true,
                createdAt: true,
                url: true,
                crawlStatus: true
            }
        });
        if (recentArticles.length === 0) {
            console.log('📭 No articles found in the last 24 hours');
        }
        else {
            console.log(`Found ${recentArticles.length} articles in the last 24 hours:\n`);
            recentArticles.forEach((article, index) => {
                const timeAgo = getTimeAgo(article.createdAt);
                console.log(`${index + 1}. [${article.platform}] ${article.question.substring(0, 80)}...`);
                console.log(`   📅 ${timeAgo} | 📝 ${article.contentType} | 🏷️ ${article.category}`);
                console.log(`   🔗 ${article.url}`);
                console.log(`   📊 Status: ${article.crawlStatus}`);
                console.log('');
            });
        }
        // 7. GROWTH TRENDS
        console.log('7️⃣ GROWTH TRENDS');
        console.log('=================');
        // Compare with previous periods
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const articles48h = await prisma.article.count({
            where: { createdAt: { gte: fortyEightHoursAgo } }
        });
        const articles24to48h = articles48h - articles24h;
        console.log(`📊 Articles (24-48h ago): ${articles24to48h}`);
        console.log(`📊 Articles (0-24h ago): ${articles24h}`);
        if (articles24to48h > 0) {
            const growthRate = ((articles24h - articles24to48h) / articles24to48h * 100).toFixed(1);
            console.log(`📈 Growth rate: ${growthRate}%`);
        }
        // Daily average calculation
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const articles7days = await prisma.article.count({
            where: { createdAt: { gte: sevenDaysAgo } }
        });
        const dailyAverage = (articles7days / 7).toFixed(1);
        console.log(`📊 7-day daily average: ${dailyAverage} articles/day`);
        console.log(`📊 Today's rate: ${articles24h} articles/day\n`);
        // 8. CONTENT QUALITY ANALYSIS (24H)
        console.log('8️⃣ CONTENT QUALITY ANALYSIS (24H)');
        console.log('==================================');
        const activeArticles24h = await prisma.article.count({
            where: {
                createdAt: { gte: twentyFourHoursAgo },
                crawlStatus: 'active'
            }
        });
        const errorArticles24h = await prisma.article.count({
            where: {
                createdAt: { gte: twentyFourHoursAgo },
                crawlStatus: 'error'
            }
        });
        const duplicateArticles24h = await prisma.article.count({
            where: {
                createdAt: { gte: twentyFourHoursAgo },
                isDuplicate: true
            }
        });
        console.log(`✅ Active articles: ${activeArticles24h}`);
        console.log(`❌ Error articles: ${errorArticles24h}`);
        console.log(`🔄 Duplicate articles: ${duplicateArticles24h}`);
        if (articles24h > 0) {
            const qualityRate = ((activeArticles24h / articles24h) * 100).toFixed(1);
            console.log(`📊 Quality rate: ${qualityRate}%\n`);
        }
        // 9. SUMMARY AND RECOMMENDATIONS
        console.log('9️⃣ SUMMARY & RECOMMENDATIONS');
        console.log('=============================');
        console.log(`📈 Content Growth: ${articles24h} new articles in 24h`);
        console.log(`📊 Database Size: ${totalArticles.toLocaleString()} total articles`);
        console.log(`🔄 Growth Rate: ${((articles24h / totalArticles) * 100).toFixed(2)}% of total in 24h`);
        if (articles24h === 0) {
            console.log('\n⚠️  WARNING: No new content in 24 hours');
            console.log('   Possible issues:');
            console.log('   - Crawler may not be running');
            console.log('   - Sources may be exhausted');
            console.log('   - Rate limiting or blocking');
            console.log('   - Database connection issues');
        }
        else if (articles24h < 10) {
            console.log('\n⚠️  LOW ACTIVITY: Minimal new content');
            console.log('   Consider:');
            console.log('   - Adding more sources');
            console.log('   - Checking crawler health');
            console.log('   - Reviewing rate limits');
        }
        else {
            console.log('\n✅ HEALTHY: Good content growth');
            console.log('   Content collection is working well');
        }
    }
    catch (error) {
        console.error('❌ Error checking 24-hour content:', error);
    }
    finally {
        await prisma.$disconnect();
        console.log('\n🔌 Database disconnected');
    }
}
// Run the analysis
check24HourContent()
    .then(() => {
    console.log('\n✅ 24-hour content analysis completed!');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
});
//# sourceMappingURL=check-24h-content.js.map