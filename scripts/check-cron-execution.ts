import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCronExecution() {
  console.log('🔍 Checking cron job execution status...\n');
  
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  try {
    // Check crawl jobs
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
      console.log('❌ No crawl jobs found - this suggests the cron job may not be running');
    } else {
      crawlJobs.forEach((job, index) => {
        const timeAgo = getTimeAgo(job.createdAt);
        console.log(`${index + 1}. ${job.source} - ${job.status} (${timeAgo})`);
        if (job.error) {
          console.log(`   Error: ${job.error}`);
        }
      });
    }

    // Check crawl queue activity
    const queueItems = await prisma.crawlQueue.findMany({
      where: {
        updatedAt: {
          gte: twentyFourHoursAgo
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    console.log(`\n🔄 CRAWL QUEUE ACTIVITY (Last 24h): ${queueItems.length} items`);
    
    const statusCounts = new Map<string, number>();
    queueItems.forEach(item => {
      statusCounts.set(item.status, (statusCounts.get(item.status) || 0) + 1);
    });

    statusCounts.forEach((count, status) => {
      console.log(`   ${status}: ${count} items`);
    });

    // Check recent articles to see when content was last added
    const recentArticles = await prisma.article.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      select: {
        question: true,
        platform: true,
        createdAt: true,
        contentType: true
      }
    });

    console.log(`\n📝 MOST RECENT ARTICLES:`);
    recentArticles.forEach((article, index) => {
      const timeAgo = getTimeAgo(article.createdAt);
      console.log(`${index + 1}. [${article.platform}] ${article.question.substring(0, 50)}...`);
      console.log(`   Added: ${timeAgo} | Type: ${article.contentType}`);
    });

    // Check if there are any articles with recent updates
    const recentlyUpdated = await prisma.article.findMany({
      where: {
        updatedAt: {
          gte: twentyFourHoursAgo
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5,
      select: {
        question: true,
        platform: true,
        updatedAt: true
      }
    });

    console.log(`\n🔄 RECENTLY UPDATED ARTICLES:`);
    if (recentlyUpdated.length === 0) {
      console.log('❌ No articles updated in the last 24 hours');
    } else {
      recentlyUpdated.forEach((article, index) => {
        const timeAgo = getTimeAgo(article.updatedAt);
        console.log(`${index + 1}. [${article.platform}] ${article.question.substring(0, 50)}...`);
        console.log(`   Updated: ${timeAgo}`);
      });
    }

    // Check for any error status articles
    const errorArticles = await prisma.article.findMany({
      where: {
        crawlStatus: 'error'
      },
      take: 5,
      select: {
        question: true,
        platform: true,
        updatedAt: true
      }
    });

    if (errorArticles.length > 0) {
      console.log(`\n⚠️ ARTICLES WITH ERROR STATUS: ${errorArticles.length}`);
      errorArticles.forEach((article, index) => {
        const timeAgo = getTimeAgo(article.updatedAt);
        console.log(`${index + 1}. [${article.platform}] ${article.question.substring(0, 50)}...`);
        console.log(`   Last updated: ${timeAgo}`);
      });
    }

    // Check database connection
    console.log(`\n🔧 DATABASE STATUS:`);
    const totalArticles = await prisma.article.count();
    const activeArticles = await prisma.article.count({
      where: { crawlStatus: 'active' }
    });
    console.log(`   Total articles: ${totalArticles}`);
    console.log(`   Active articles: ${activeArticles}`);
    console.log(`   Articles with errors: ${totalArticles - activeArticles}`);

    // Summary and recommendations
    console.log(`\n📊 SUMMARY:`);
    if (crawlJobs.length === 0) {
      console.log('❌ CRITICAL: No crawl jobs found - cron job may not be executing');
      console.log('   Possible issues:');
      console.log('   - Render cron job is not running');
      console.log('   - Environment variables missing');
      console.log('   - Build/deployment issues');
      console.log('   - Database connection problems');
    } else {
      console.log('✅ Crawl jobs are being created');
      if (recentArticles.length > 0) {
        const lastArticleTime = getTimeAgo(recentArticles[0].createdAt);
        console.log(`   Last article added: ${lastArticleTime}`);
        if (lastArticleTime.includes('hour') && parseInt(lastArticleTime.split(' ')[0]) > 12) {
          console.log('⚠️ WARNING: No recent content - crawler may be failing to find new content');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking cron execution:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  
  if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

// Run the check
checkCronExecution().catch(console.error); 