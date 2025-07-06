"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkContentStats() {
    console.log('📊 Checking Content Statistics in Database...\n');
    try {
        // Count all content tables
        const [articleCount, answerCount, articleParagraphCount, importedGYGCount, submittedQuestionCount, crawlQueueCount, crawlJobCount, reportCount] = await Promise.all([
            prisma.article.count(),
            prisma.answer.count(),
            prisma.articleParagraph.count(),
            prisma.importedGYGActivity.count(),
            prisma.submittedQuestion.count(),
            prisma.crawlQueue.count(),
            prisma.crawlJob.count(),
            prisma.report.count()
        ]);
        console.log('📈 TOTAL CONTENT RECORDS:');
        console.log(`   Articles: ${articleCount.toLocaleString()}`);
        console.log(`   Answers: ${answerCount.toLocaleString()}`);
        console.log(`   Article Paragraphs: ${articleParagraphCount.toLocaleString()}`);
        console.log(`   Imported GYG Activities: ${importedGYGCount.toLocaleString()}`);
        console.log(`   Submitted Questions: ${submittedQuestionCount.toLocaleString()}`);
        console.log(`   Crawl Queue Items: ${crawlQueueCount.toLocaleString()}`);
        console.log(`   Crawl Jobs: ${crawlJobCount.toLocaleString()}`);
        console.log(`   Reports: ${reportCount.toLocaleString()}`);
        const totalContent = articleCount + answerCount + articleParagraphCount + importedGYGCount + submittedQuestionCount;
        console.log(`\n🎯 TOTAL CONTENT ITEMS: ${totalContent.toLocaleString()}\n`);
        // Detailed breakdowns
        console.log('📋 DETAILED BREAKDOWNS:');
        // Articles by platform
        const articlesByPlatform = await prisma.article.groupBy({
            by: ['platform'],
            _count: { platform: true }
        });
        console.log('\n📰 Articles by Platform:');
        articlesByPlatform.forEach(item => {
            console.log(`   ${item.platform}: ${item._count.platform.toLocaleString()}`);
        });
        // Articles by category
        const articlesByCategory = await prisma.article.groupBy({
            by: ['category'],
            _count: { category: true }
        });
        console.log('\n📂 Articles by Category:');
        articlesByCategory.forEach(item => {
            console.log(`   ${item.category}: ${item._count.category.toLocaleString()}`);
        });
        // Articles by content type
        const articlesByContentType = await prisma.article.groupBy({
            by: ['contentType'],
            _count: { contentType: true }
        });
        console.log('\n🏷️ Articles by Content Type:');
        articlesByContentType.forEach(item => {
            console.log(`   ${item.contentType}: ${item._count.contentType.toLocaleString()}`);
        });
        // Articles by language
        const articlesByLanguage = await prisma.article.groupBy({
            by: ['language'],
            _count: { language: true }
        });
        console.log('\n🌍 Articles by Language:');
        articlesByLanguage.forEach(item => {
            console.log(`   ${item.language}: ${item._count.language.toLocaleString()}`);
        });
        // Answers by platform
        const answersByPlatform = await prisma.answer.groupBy({
            by: ['platform'],
            _count: { platform: true }
        });
        console.log('\n💬 Answers by Platform:');
        answersByPlatform.forEach(item => {
            console.log(`   ${item.platform}: ${item._count.platform.toLocaleString()}`);
        });
        // GYG Activities by provider
        const gygByProvider = await prisma.importedGYGActivity.groupBy({
            by: ['providerName'],
            _count: { providerName: true }
        });
        console.log('\n🎯 GYG Activities by Provider:');
        gygByProvider.slice(0, 10).forEach(item => {
            console.log(`   ${item.providerName}: ${item._count.providerName.toLocaleString()}`);
        });
        if (gygByProvider.length > 10) {
            console.log(`   ... and ${gygByProvider.length - 10} more providers`);
        }
        // Recent activity
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const recentArticles = await prisma.article.count({
            where: { createdAt: { gte: lastWeek } }
        });
        const recentAnswers = await prisma.answer.count({
            where: { createdAt: { gte: lastWeek } }
        });
        console.log('\n⏰ Recent Activity (Last 7 Days):');
        console.log(`   New Articles: ${recentArticles.toLocaleString()}`);
        console.log(`   New Answers: ${recentAnswers.toLocaleString()}`);
        // Content quality metrics
        const duplicateArticles = await prisma.article.count({
            where: { isDuplicate: true }
        });
        const verifiedArticles = await prisma.article.count({
            where: { isVerified: true }
        });
        console.log('\n🔍 Content Quality Metrics:');
        console.log(`   Duplicate Articles: ${duplicateArticles.toLocaleString()}`);
        console.log(`   Verified Articles: ${verifiedArticles.toLocaleString()}`);
        // Storage estimation (rough calculation)
        const avgArticleLength = 1000; // characters
        const avgAnswerLength = 500; // characters
        const avgParagraphLength = 200; // characters
        const estimatedStorage = (articleCount * avgArticleLength +
            answerCount * avgAnswerLength +
            articleParagraphCount * avgParagraphLength) / (1024 * 1024); // Convert to MB
        console.log('\n💾 Estimated Storage:');
        console.log(`   ~${estimatedStorage.toFixed(2)} MB of text content`);
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