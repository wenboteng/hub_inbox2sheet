#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCronStatus() {
  console.log('🔍 CRON JOB STATUS CHECK');
  console.log('========================');
  console.log(`⏰ Check time: ${new Date().toISOString()}`);
  console.log('');

  try {
    await prisma.$connect();
    
    // Check recent crawl jobs
    console.log('📋 RECENT CRAWL JOBS:');
    const recentJobs = await prisma.crawlJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (recentJobs.length === 0) {
      console.log('❌ No crawl jobs found in database');
    } else {
      recentJobs.forEach((job, index) => {
        const duration = job.endedAt && job.startedAt 
          ? Math.round((job.endedAt.getTime() - job.startedAt.getTime()) / 1000)
          : 'N/A';
        
        console.log(`${index + 1}. ${job.source}`);
        console.log(`   Status: ${job.status}`);
        console.log(`   Started: ${job.startedAt?.toISOString() || 'N/A'}`);
        console.log(`   Ended: ${job.endedAt?.toISOString() || 'N/A'}`);
        console.log(`   Duration: ${duration}s`);
        if (job.error) {
          console.log(`   Error: ${job.error}`);
        }
        console.log('');
      });
    }

    // Check recent articles
    console.log('📝 RECENT CONTENT COLLECTION:');
    const recentArticles = await prisma.article.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        question: true,
        platform: true,
        category: true,
        createdAt: true,
        url: true
      }
    });

    if (recentArticles.length === 0) {
      console.log('❌ No articles found in database');
    } else {
      console.log(`Found ${recentArticles.length} most recent articles:`);
      recentArticles.forEach((article, index) => {
        const timeAgo = Math.round((Date.now() - article.createdAt.getTime()) / (1000 * 60 * 60));
        console.log(`${index + 1}. ${article.question}`);
        console.log(`   Platform: ${article.platform} | Category: ${article.category}`);
        console.log(`   Added: ${timeAgo} hours ago`);
        console.log(`   URL: ${article.url}`);
        console.log('');
      });
    }

    // Check crawl queue status
    console.log('🔄 CRAWL QUEUE STATUS:');
    const queueStats = await prisma.crawlQueue.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    if (queueStats.length === 0) {
      console.log('❌ No items in crawl queue');
    } else {
      queueStats.forEach(stat => {
        console.log(`   ${stat.status}: ${stat._count.id} items`);
      });
    }

    // Check content by platform
    console.log('\n📊 CONTENT BY PLATFORM:');
    const platformStats = await prisma.article.groupBy({
      by: ['platform'],
      _count: { id: true }
    });

    platformStats.forEach(stat => {
      console.log(`   ${stat.platform}: ${stat._count.id} articles`);
    });

    // Check for any errors in recent articles
    console.log('\n⚠️  ERROR CHECK:');
    const errorArticles = await prisma.article.findMany({
      where: {
        crawlStatus: 'error'
      },
      take: 5
    });

    if (errorArticles.length > 0) {
      console.log(`Found ${errorArticles.length} articles with error status:`);
      errorArticles.forEach(article => {
        console.log(`   - ${article.question} (${article.platform})`);
      });
    } else {
      console.log('✅ No articles with error status found');
    }

    // Summary
    console.log('\n📈 SUMMARY:');
    const totalArticles = await prisma.article.count();
    const todayArticles = await prisma.article.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });
    const weekArticles = await prisma.article.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    console.log(`Total articles in database: ${totalArticles}`);
    console.log(`Articles added in last 24 hours: ${todayArticles}`);
    console.log(`Articles added in last 7 days: ${weekArticles}`);

    if (todayArticles === 0) {
      console.log('\n⚠️  WARNING: No new content collected in the last 24 hours');
      console.log('   This might indicate that the cron jobs are not running properly');
    } else {
      console.log('\n✅ Content collection appears to be active');
    }

  } catch (error) {
    console.error('❌ Error checking cron status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
if (require.main === module) {
  checkCronStatus()
    .catch(console.error)
    .finally(() => process.exit(0));
}

export { checkCronStatus }; 