"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkRenderCron() {
    console.log('🔍 Checking Render cron job status...\n');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
        // Check all crawl jobs in the last 24 hours
        const crawlJobs = await prisma.crawlJob.findMany({
            where: {
                createdAt: {
                    gte: twentyFourHoursAgo
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        console.log(`📋 CRAWL JOBS (Last 24h): ${crawlJobs.length}`);
        if (crawlJobs.length === 0) {
            console.log('❌ CRITICAL: No crawl jobs found in 24 hours!');
            console.log('   This means the Render cron job is NOT creating crawl jobs.');
            console.log('   Possible issues:');
            console.log('   - Render cron job is not running at all');
            console.log('   - Environment variables missing on Render');
            console.log('   - Database connection issues on Render');
            console.log('   - Build/deployment failures on Render');
            console.log('   - Script is failing before creating crawl jobs');
        }
        else {
            console.log('✅ Crawl jobs are being created');
            crawlJobs.forEach((job, index) => {
                const timeAgo = getTimeAgo(job.createdAt);
                console.log(`${index + 1}. ${job.source} - ${job.status} (${timeAgo})`);
                if (job.error) {
                    console.log(`   Error: ${job.error}`);
                }
            });
        }
        // Check recent articles to see the pattern
        const recentArticles = await prisma.article.findMany({
            where: {
                createdAt: {
                    gte: twentyFourHoursAgo
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                question: true,
                platform: true,
                createdAt: true,
                contentType: true,
                source: true
            }
        });
        console.log(`\n📝 ARTICLES CREATED (Last 24h): ${recentArticles.length}`);
        if (recentArticles.length > 0) {
            // Group by hour to see if there's a pattern
            const hourlyStats = new Map();
            recentArticles.forEach(article => {
                const hour = article.createdAt.getHours();
                hourlyStats.set(hour, (hourlyStats.get(hour) || 0) + 1);
            });
            console.log('\n🕐 HOURLY DISTRIBUTION:');
            for (let hour = 0; hour < 24; hour++) {
                const count = hourlyStats.get(hour) || 0;
                if (count > 0) {
                    console.log(`   ${hour.toString().padStart(2, '0')}:00 - ${count} articles`);
                }
            }
            // Check if articles are being created in batches (indicating manual runs)
            const timeGaps = [];
            for (let i = 1; i < recentArticles.length; i++) {
                const gap = recentArticles[i - 1].createdAt.getTime() - recentArticles[i].createdAt.getTime();
                timeGaps.push(gap);
            }
            const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
            console.log(`\n⏱️  Average time between articles: ${Math.round(avgGap / 1000)} seconds`);
            if (avgGap < 60000) { // Less than 1 minute
                console.log('   This suggests articles are being created in batches (manual runs)');
            }
            else {
                console.log('   This suggests articles are being created individually (cron job)');
            }
        }
        // Check for any error patterns
        const errorArticles = await prisma.article.findMany({
            where: {
                crawlStatus: 'error',
                createdAt: {
                    gte: twentyFourHoursAgo
                }
            },
            select: {
                question: true,
                platform: true,
                createdAt: true
            }
        });
        if (errorArticles.length > 0) {
            console.log(`\n⚠️  ARTICLES WITH ERRORS (Last 24h): ${errorArticles.length}`);
            errorArticles.slice(0, 5).forEach((article, index) => {
                const timeAgo = getTimeAgo(article.createdAt);
                console.log(`   ${index + 1}. [${article.platform}] ${article.question.substring(0, 50)}...`);
                console.log(`      Created: ${timeAgo}`);
            });
        }
        // Check database connection
        console.log(`\n🔧 DATABASE STATUS:`);
        const totalArticles = await prisma.article.count();
        console.log(`   Total articles in database: ${totalArticles}`);
        // Summary and recommendations
        console.log(`\n📊 RENDER CRON ANALYSIS:`);
        if (crawlJobs.length === 0) {
            console.log('❌ RENDER CRON JOB IS NOT WORKING');
            console.log('\n🔧 IMMEDIATE ACTIONS NEEDED:');
            console.log('1. Check Render dashboard for cron job status');
            console.log('2. Check Render logs for error messages');
            console.log('3. Verify environment variables are set on Render');
            console.log('4. Check if the cron job is actually deployed');
            console.log('5. Verify the schedule is correct (should be "0 * * * *")');
            console.log('6. Check if the build command is succeeding');
            console.log('7. Verify the start command is correct (npm run scrape:all)');
        }
        else {
            console.log('✅ Render cron job is creating crawl jobs');
            console.log('   The issue might be in the scraping logic itself');
        }
    }
    catch (error) {
        console.error('❌ Error checking Render cron:', error);
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
checkRenderCron().catch(console.error);
//# sourceMappingURL=check-render-cron.js.map