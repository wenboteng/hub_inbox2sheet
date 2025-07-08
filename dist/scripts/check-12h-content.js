"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function check12HourContent() {
    console.log('🔍 Checking content collected in the last 12 hours...\n');
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    try {
        // Check articles created in last 12 hours
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
                source: true,
                createdAt: true,
                crawlStatus: true
            }
        });
        console.log(`📝 ARTICLES CREATED (Last 12h): ${recentArticles.length}`);
        if (recentArticles.length === 0) {
            console.log('❌ No new articles found in the last 12 hours');
        }
        else {
            // Group by platform
            const platformCounts = new Map();
            const platformDetails = new Map();
            recentArticles.forEach(article => {
                platformCounts.set(article.platform, (platformCounts.get(article.platform) || 0) + 1);
                if (!platformDetails.has(article.platform)) {
                    platformDetails.set(article.platform, []);
                }
                platformDetails.get(article.platform).push(article);
            });
            console.log('\n📊 BY PLATFORM:');
            platformCounts.forEach((count, platform) => {
                console.log(`   ${platform}: ${count} articles`);
            });
            console.log('\n📋 DETAILED BREAKDOWN:');
            platformDetails.forEach((articles, platform) => {
                console.log(`\n   ${platform.toUpperCase()}:`);
                articles.forEach((article, index) => {
                    const timeAgo = getTimeAgo(article.createdAt);
                    console.log(`     ${index + 1}. ${article.question.substring(0, 60)}...`);
                    console.log(`        Category: ${article.category} | Type: ${article.contentType} | Source: ${article.source}`);
                    console.log(`        Status: ${article.crawlStatus} | Created: ${timeAgo}`);
                });
            });
        }
        // Check crawl jobs in last 12 hours
        const recentCrawlJobs = await prisma.crawlJob.findMany({
            where: {
                createdAt: {
                    gte: twelveHoursAgo
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        console.log(`\n🔄 CRAWL JOBS (Last 12h): ${recentCrawlJobs.length}`);
        if (recentCrawlJobs.length > 0) {
            const jobStatusCounts = new Map();
            recentCrawlJobs.forEach(job => {
                jobStatusCounts.set(job.status, (jobStatusCounts.get(job.status) || 0) + 1);
            });
            jobStatusCounts.forEach((count, status) => {
                console.log(`   ${status}: ${count} jobs`);
            });
            console.log('\n📋 RECENT CRAWL JOBS:');
            recentCrawlJobs.slice(0, 10).forEach((job, index) => {
                const timeAgo = getTimeAgo(job.createdAt);
                console.log(`   ${index + 1}. ${job.source} - ${job.status} (${timeAgo})`);
                if (job.error) {
                    console.log(`      Error: ${job.error}`);
                }
            });
        }
        // Check crawl queue activity
        const recentQueueActivity = await prisma.crawlQueue.findMany({
            where: {
                updatedAt: {
                    gte: twelveHoursAgo
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
        console.log(`\n🔄 CRAWL QUEUE ACTIVITY (Last 12h): ${recentQueueActivity.length} items`);
        if (recentQueueActivity.length > 0) {
            const queueStatusCounts = new Map();
            recentQueueActivity.forEach(item => {
                queueStatusCounts.set(item.status, (queueStatusCounts.get(item.status) || 0) + 1);
            });
            queueStatusCounts.forEach((count, status) => {
                console.log(`   ${status}: ${count} items`);
            });
        }
        // Check for any errors in recent content
        const errorArticles = await prisma.article.findMany({
            where: {
                crawlStatus: 'error',
                createdAt: {
                    gte: twelveHoursAgo
                }
            },
            select: {
                question: true,
                platform: true,
                createdAt: true
            }
        });
        if (errorArticles.length > 0) {
            console.log(`\n⚠️ ARTICLES WITH ERRORS (Last 12h): ${errorArticles.length}`);
            errorArticles.forEach((article, index) => {
                const timeAgo = getTimeAgo(article.createdAt);
                console.log(`   ${index + 1}. [${article.platform}] ${article.question.substring(0, 50)}...`);
                console.log(`      Created: ${timeAgo}`);
            });
        }
        // Summary
        console.log(`\n📊 12-HOUR SUMMARY:`);
        console.log(`   New articles: ${recentArticles.length}`);
        console.log(`   Crawl jobs: ${recentCrawlJobs.length}`);
        console.log(`   Queue items processed: ${recentQueueActivity.length}`);
        console.log(`   Articles with errors: ${errorArticles.length}`);
        if (recentArticles.length === 0) {
            console.log('\n❌ ALERT: No new content collected in the last 12 hours!');
            console.log('   This could indicate:');
            console.log('   - Cron job is not running');
            console.log('   - Crawlers are failing');
            console.log('   - No new content available from sources');
            console.log('   - Database connection issues');
        }
        else {
            console.log(`\n✅ Content collection is active - ${recentArticles.length} new articles found`);
        }
    }
    catch (error) {
        console.error('❌ Error checking 12-hour content:', error);
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
check12HourContent().catch(console.error);
//# sourceMappingURL=check-12h-content.js.map