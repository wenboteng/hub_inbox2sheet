"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkRecentContent() {
    console.log('🔍 Checking content collected in the last 12 hours...\n');
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    try {
        // Get recent articles
        const recentArticles = await prisma.article.findMany({
            where: {
                createdAt: {
                    gte: twelveHoursAgo
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                question: true,
                platform: true,
                category: true,
                contentType: true,
                createdAt: true,
                url: true,
                crawlStatus: true
            }
        });
        // Get recent reports
        const recentReports = await prisma.report.findMany({
            where: {
                createdAt: {
                    gte: twelveHoursAgo
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                title: true,
                type: true,
                createdAt: true,
                isPublic: true
            }
        });
        // Get recent questions
        const recentQuestions = await prisma.submittedQuestion.findMany({
            where: {
                createdAt: {
                    gte: twelveHoursAgo
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                question: true,
                platform: true,
                status: true,
                createdAt: true,
                isPublic: true
            }
        });
        console.log(`📊 SUMMARY (Last 12 hours):`);
        console.log(`   Articles: ${recentArticles.length}`);
        console.log(`   Reports: ${recentReports.length}`);
        console.log(`   Questions: ${recentQuestions.length}\n`);
        if (recentArticles.length > 0) {
            console.log(`📝 RECENT ARTICLES (${recentArticles.length}):`);
            console.log('─'.repeat(80));
            const platformStats = new Map();
            const contentTypeStats = new Map();
            recentArticles.forEach((article, index) => {
                const timeAgo = getTimeAgo(article.createdAt);
                console.log(`${index + 1}. [${article.platform}] ${article.question.substring(0, 60)}...`);
                console.log(`   Category: ${article.category} | Type: ${article.contentType} | ${timeAgo}`);
                console.log(`   URL: ${article.url}`);
                console.log('');
                // Update stats
                platformStats.set(article.platform, (platformStats.get(article.platform) || 0) + 1);
                contentTypeStats.set(article.contentType, (contentTypeStats.get(article.contentType) || 0) + 1);
            });
            console.log(`📈 PLATFORM BREAKDOWN:`);
            platformStats.forEach((count, platform) => {
                console.log(`   ${platform}: ${count} articles`);
            });
            console.log(`\n📈 CONTENT TYPE BREAKDOWN:`);
            contentTypeStats.forEach((count, type) => {
                console.log(`   ${type}: ${count} articles`);
            });
        }
        if (recentReports.length > 0) {
            console.log(`\n📊 RECENT REPORTS (${recentReports.length}):`);
            console.log('─'.repeat(80));
            recentReports.forEach((report, index) => {
                const timeAgo = getTimeAgo(report.createdAt);
                console.log(`${index + 1}. ${report.title}`);
                console.log(`   Type: ${report.type} | Public: ${report.isPublic} | ${timeAgo}`);
                console.log('');
            });
        }
        if (recentQuestions.length > 0) {
            console.log(`\n❓ RECENT QUESTIONS (${recentQuestions.length}):`);
            console.log('─'.repeat(80));
            recentQuestions.forEach((question, index) => {
                const timeAgo = getTimeAgo(question.createdAt);
                console.log(`${index + 1}. [${question.platform}] ${question.question.substring(0, 60)}...`);
                console.log(`   Status: ${question.status} | Public: ${question.isPublic} | ${timeAgo}`);
                console.log('');
            });
        }
        if (recentArticles.length === 0 && recentReports.length === 0 && recentQuestions.length === 0) {
            console.log('❌ No new content found in the last 12 hours.');
            console.log('   This could mean:');
            console.log('   - The crawler hasn\'t run recently');
            console.log('   - No new content was found on the sources');
            console.log('   - There were errors during the crawling process');
        }
        // Check crawler status
        console.log(`\n🔧 CRAWLER STATUS:`);
        const totalArticles = await prisma.article.count();
        const activeArticles = await prisma.article.count({
            where: { crawlStatus: 'active' }
        });
        const inactiveArticles = await prisma.article.count({
            where: { crawlStatus: 'inactive' }
        });
        console.log(`   Total articles in database: ${totalArticles}`);
        console.log(`   Active articles: ${activeArticles}`);
        console.log(`   Inactive articles: ${inactiveArticles}`);
        // Check last crawl time
        const lastArticle = await prisma.article.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
        });
        if (lastArticle) {
            const lastCrawlTime = getTimeAgo(lastArticle.createdAt);
            console.log(`   Last article added: ${lastCrawlTime}`);
        }
    }
    catch (error) {
        console.error('❌ Error checking recent content:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
function getTimeAgo(date) {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    if (diffInHours > 0) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    else if (diffInMinutes > 0) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    else {
        return 'Just now';
    }
}
// Run the check
checkRecentContent().catch(console.error);
//# sourceMappingURL=check-recent-content.js.map