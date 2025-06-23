import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatus() {
  try {
    await prisma.$connect();
    
    const totalArticles = await prisma.article.count();
    const officialArticles = await prisma.article.count({
      where: { contentType: 'official' },
    });
    const communityArticles = await prisma.article.count({
      where: { contentType: 'community' },
    });

    const platformStats = await prisma.article.groupBy({
      by: ['platform'],
      _count: { id: true },
    });

    console.log('\n📊 CURRENT DATABASE STATUS:');
    console.log(`Total articles: ${totalArticles}`);
    console.log(`Official articles: ${officialArticles}`);
    console.log(`Community articles: ${communityArticles}`);
    console.log('\nPlatform breakdown:');
    platformStats.forEach((stat: { platform: string; _count: { id: number } }) => {
      console.log(`  ${stat.platform}: ${stat._count.id} articles`);
    });

    // Check recent articles
    const recentArticles = await prisma.article.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { question: true, platform: true, contentType: true, createdAt: true }
    });

    console.log('\n🆕 5 Most Recent Articles:');
    recentArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.question} (${article.platform} - ${article.contentType})`);
      console.log(`   Created: ${article.createdAt.toISOString()}`);
    });

  } catch (error) {
    console.error('Error checking status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus(); 