import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check24HourContent() {
  console.log('🔍 Checking content added in the last 24 hours...\n');
  
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  try {
    // Get articles from last 24 hours
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
        id: true,
        question: true,
        platform: true,
        category: true,
        contentType: true,
        createdAt: true,
        url: true,
        source: true
      }
    });

    console.log(`📊 ARTICLES ADDED IN LAST 24 HOURS: ${recentArticles.length}\n`);

    if (recentArticles.length > 0) {
      // Group by platform
      const platformGroups = new Map<string, typeof recentArticles>();
      recentArticles.forEach(article => {
        if (!platformGroups.has(article.platform)) {
          platformGroups.set(article.platform, []);
        }
        platformGroups.get(article.platform)!.push(article);
      });

      // Show by platform
      platformGroups.forEach((articles, platform) => {
        console.log(`📱 ${platform.toUpperCase()} (${articles.length} articles):`);
        console.log('─'.repeat(60));
        
        articles.slice(0, 5).forEach((article, index) => {
          const timeAgo = getTimeAgo(article.createdAt);
          console.log(`${index + 1}. ${article.question.substring(0, 50)}...`);
          console.log(`   Category: ${article.category} | Type: ${article.contentType} | ${timeAgo}`);
        });
        
        if (articles.length > 5) {
          console.log(`   ... and ${articles.length - 5} more articles`);
        }
        console.log('');
      });

      // Show content type breakdown
      const contentTypeStats = new Map<string, number>();
      recentArticles.forEach(article => {
        contentTypeStats.set(article.contentType, (contentTypeStats.get(article.contentType) || 0) + 1);
      });

      console.log(`📈 CONTENT TYPE BREAKDOWN:`);
      contentTypeStats.forEach((count, type) => {
        console.log(`   ${type}: ${count} articles`);
      });

      // Show source breakdown
      const sourceStats = new Map<string, number>();
      recentArticles.forEach(article => {
        sourceStats.set(article.source, (sourceStats.get(article.source) || 0) + 1);
      });

      console.log(`\n📈 SOURCE BREAKDOWN:`);
      sourceStats.forEach((count, source) => {
        console.log(`   ${source}: ${count} articles`);
      });
    }

    // Check recent crawl queue activity
    const recentQueueItems = await prisma.crawlQueue.findMany({
      where: {
        createdAt: {
          gte: twentyFourHoursAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        url: true,
        platform: true,
        type: true,
        status: true,
        createdAt: true
      }
    });

    console.log(`\n🔄 CRAWL QUEUE ACTIVITY (Last 24h):`);
    console.log(`   Total queue items: ${recentQueueItems.length}`);
    
    const queueStatusStats = new Map<string, number>();
    recentQueueItems.forEach(item => {
      queueStatusStats.set(item.status, (queueStatusStats.get(item.status) || 0) + 1);
    });

    queueStatusStats.forEach((count, status) => {
      console.log(`   ${status}: ${count} items`);
    });

    // Check if crawler is running
    console.log(`\n🔧 CRAWLER STATUS:`);
    const processingItems = recentQueueItems.filter(item => item.status === 'processing');
    if (processingItems.length > 0) {
      console.log(`   ⚡ Crawler appears to be running (${processingItems.length} items processing)`);
    } else {
      console.log(`   💤 Crawler appears to be idle`);
    }

    // Show some recent examples
    if (recentArticles.length > 0) {
      console.log(`\n📝 RECENT EXAMPLES (Last 10 articles):`);
      console.log('─'.repeat(80));
      
      recentArticles.slice(0, 10).forEach((article, index) => {
        const timeAgo = getTimeAgo(article.createdAt);
        console.log(`${index + 1}. [${article.platform}] ${article.question}`);
        console.log(`   ${article.url}`);
        console.log(`   Added: ${timeAgo} | Type: ${article.contentType} | Source: ${article.source}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error checking 24-hour content:', error);
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
check24HourContent().catch(console.error); 