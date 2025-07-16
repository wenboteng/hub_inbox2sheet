"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function comprehensiveContentSummary() {
    console.log('📊 COMPREHENSIVE CONTENT COLLECTION SUMMARY');
    console.log('===========================================\n');
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully\n');
        // 1. MAIN CONTENT TABLES
        console.log('1️⃣ MAIN CONTENT TABLES');
        console.log('======================');
        const totalArticles = await prisma.article.count();
        const totalAnswers = await prisma.answer.count();
        const totalSubmittedQuestions = await prisma.submittedQuestion.count();
        const totalReports = await prisma.report.count();
        console.log(`📚 Articles: ${totalArticles.toLocaleString()}`);
        console.log(`💬 Answers: ${totalAnswers.toLocaleString()}`);
        console.log(`❓ Submitted Questions: ${totalSubmittedQuestions.toLocaleString()}`);
        console.log(`📋 Reports: ${totalReports.toLocaleString()}`);
        console.log(`📈 Total Main Content: ${(totalArticles + totalAnswers + totalSubmittedQuestions + totalReports).toLocaleString()}\n`);
        // 2. IMPORTED DATA TABLES
        console.log('2️⃣ IMPORTED DATA TABLES');
        console.log('=======================');
        const totalGYGActivities = await prisma.importedGYGActivity.count();
        const totalMadridActivities = await prisma.importedMadridActivity.count();
        // Check if GYG Provider table exists
        let totalGYGProviders = 0;
        try {
            totalGYGProviders = await prisma.importedGYGProvider.count();
        }
        catch (error) {
            console.log('⚠️ GYG Provider table not found in database');
        }
        console.log(`📍 GYG Activities: ${totalGYGActivities.toLocaleString()}`);
        console.log(`🏛️ Madrid Activities: ${totalMadridActivities.toLocaleString()}`);
        console.log(`🏢 GYG Providers: ${totalGYGProviders.toLocaleString()}`);
        console.log(`📊 Total Imported Data: ${(totalGYGActivities + totalMadridActivities + totalGYGProviders).toLocaleString()}\n`);
        // 3. ARTICLES BY PLATFORM
        console.log('3️⃣ ARTICLES BY PLATFORM');
        console.log('========================');
        const platformStats = await prisma.article.groupBy({
            by: ['platform'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        });
        platformStats.forEach(stat => {
            console.log(`🏢 ${stat.platform}: ${stat._count.id.toLocaleString()} articles`);
        });
        console.log();
        // 4. ARTICLES BY CONTENT TYPE
        console.log('4️⃣ ARTICLES BY CONTENT TYPE');
        console.log('============================');
        const contentTypeStats = await prisma.article.groupBy({
            by: ['contentType'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        });
        contentTypeStats.forEach(stat => {
            console.log(`📝 ${stat.contentType}: ${stat._count.id.toLocaleString()} articles`);
        });
        console.log();
        // 5. ARTICLES BY SOURCE
        console.log('5️⃣ ARTICLES BY SOURCE');
        console.log('======================');
        const sourceStats = await prisma.article.groupBy({
            by: ['source'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        });
        sourceStats.forEach(stat => {
            console.log(`🔗 ${stat.source}: ${stat._count.id.toLocaleString()} articles`);
        });
        console.log();
        // 6. TOP CATEGORIES
        console.log('6️⃣ TOP CATEGORIES');
        console.log('==================');
        const categoryStats = await prisma.article.groupBy({
            by: ['category'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
        });
        categoryStats.forEach(stat => {
            console.log(`🏷️ ${stat.category}: ${stat._count.id.toLocaleString()} articles`);
        });
        console.log();
        // 7. RECENT ACTIVITY
        console.log('7️⃣ RECENT ACTIVITY (LAST 24 HOURS)');
        console.log('===================================');
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentArticles = await prisma.article.count({
            where: { createdAt: { gte: twentyFourHoursAgo } }
        });
        const recentAnswers = await prisma.answer.count({
            where: { createdAt: { gte: twentyFourHoursAgo } }
        });
        const recentQuestions = await prisma.submittedQuestion.count({
            where: { createdAt: { gte: twentyFourHoursAgo } }
        });
        const recentReports = await prisma.report.count({
            where: { createdAt: { gte: twentyFourHoursAgo } }
        });
        console.log(`🆕 New Articles: ${recentArticles.toLocaleString()}`);
        console.log(`🆕 New Answers: ${recentAnswers.toLocaleString()}`);
        console.log(`🆕 New Questions: ${recentQuestions.toLocaleString()}`);
        console.log(`🆕 New Reports: ${recentReports.toLocaleString()}`);
        console.log(`🆕 Total New Content: ${(recentArticles + recentAnswers + recentQuestions + recentReports).toLocaleString()}\n`);
        // 8. CONTENT GROWTH RATE
        console.log('8️⃣ CONTENT GROWTH RATE');
        console.log('=======================');
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const lastWeekArticles = await prisma.article.count({
            where: { createdAt: { gte: sevenDaysAgo } }
        });
        const lastMonthArticles = await prisma.article.count({
            where: { createdAt: { gte: thirtyDaysAgo } }
        });
        console.log(`📅 Last 7 days: ${lastWeekArticles.toLocaleString()} articles`);
        console.log(`📅 Last 30 days: ${lastMonthArticles.toLocaleString()} articles`);
        console.log(`📊 Daily average (7 days): ${(lastWeekArticles / 7).toFixed(1)} articles/day`);
        console.log(`📊 Daily average (30 days): ${(lastMonthArticles / 30).toFixed(1)} articles/day\n`);
        // 9. DATABASE HEALTH
        console.log('9️⃣ DATABASE HEALTH');
        console.log('==================');
        const activeArticles = await prisma.article.count({
            where: { crawlStatus: 'active' }
        });
        const inactiveArticles = await prisma.article.count({
            where: { crawlStatus: 'inactive' }
        });
        const errorArticles = await prisma.article.count({
            where: { crawlStatus: 'error' }
        });
        const duplicateArticles = await prisma.article.count({
            where: { isDuplicate: true }
        });
        console.log(`✅ Active articles: ${activeArticles.toLocaleString()}`);
        console.log(`⏸️ Inactive articles: ${inactiveArticles.toLocaleString()}`);
        console.log(`❌ Error articles: ${errorArticles.toLocaleString()}`);
        console.log(`🔄 Duplicate articles: ${duplicateArticles.toLocaleString()}\n`);
        // 10. GYG DATA QUALITY
        console.log('🔟 GYG DATA QUALITY');
        console.log('===================');
        const gygWithPrice = await prisma.importedGYGActivity.count({
            where: { priceNumeric: { not: null } }
        });
        const gygWithRating = await prisma.importedGYGActivity.count({
            where: { ratingNumeric: { not: null } }
        });
        const madridWithPrice = await prisma.importedMadridActivity.count({
            where: { priceNumeric: { not: null } }
        });
        const madridWithRating = await prisma.importedMadridActivity.count({
            where: { ratingNumeric: { not: null } }
        });
        console.log(`💰 GYG with price data: ${gygWithPrice}/${totalGYGActivities} (${((gygWithPrice / totalGYGActivities) * 100).toFixed(1)}%)`);
        console.log(`⭐ GYG with rating data: ${gygWithRating}/${totalGYGActivities} (${((gygWithRating / totalGYGActivities) * 100).toFixed(1)}%)`);
        console.log(`💰 Madrid with price data: ${madridWithPrice}/${totalMadridActivities} (${((madridWithPrice / totalMadridActivities) * 100).toFixed(1)}%)`);
        console.log(`⭐ Madrid with rating data: ${madridWithRating}/${totalMadridActivities} (${((madridWithRating / totalMadridActivities) * 100).toFixed(1)}%)\n`);
        // 11. GRAND TOTAL
        console.log('🎯 GRAND TOTAL SUMMARY');
        console.log('======================');
        const totalMainContent = totalArticles + totalAnswers + totalSubmittedQuestions + totalReports;
        const totalImportedData = totalGYGActivities + totalMadridActivities + totalGYGProviders;
        const grandTotal = totalMainContent + totalImportedData;
        console.log(`📚 Main Content Items: ${totalMainContent.toLocaleString()}`);
        console.log(`📊 Imported Data Items: ${totalImportedData.toLocaleString()}`);
        console.log(`🎉 GRAND TOTAL: ${grandTotal.toLocaleString()} items\n`);
        console.log('✅ Comprehensive content summary completed!');
    }
    catch (error) {
        console.error('❌ Error generating comprehensive summary:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the function
comprehensiveContentSummary()
    .then(() => {
    console.log('📊 Summary generation completed!');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Summary generation failed:', error);
    process.exit(1);
});
//# sourceMappingURL=comprehensive-content-summary.js.map