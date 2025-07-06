import { crawlAirbnbCommunity } from '../src/crawlers/airbnb-community';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEnhancedAirbnbCommunity() {
  console.log('🚀 TESTING ENHANCED AIRBNB COMMUNITY CRAWLER');
  console.log('=============================================\n');

  try {
    // Get current Airbnb article count
    const currentCount = await prisma.article.count({
      where: { platform: 'Airbnb' }
    });

    console.log(`📊 Current Airbnb articles in database: ${currentCount.toLocaleString()}`);
    console.log('');

    // Run the enhanced crawler
    console.log('🔄 Starting enhanced Airbnb Community crawl...');
    console.log('   - Max threads per category: 500 (increased from 200)');
    console.log('   - Max replies per thread: 200 (increased from 100)');
    console.log('   - Max pages per category: 50 (new pagination support)');
    console.log('   - 8 predefined categories for comprehensive coverage');
    console.log('   - Conservative rate limiting: 800-2000ms between requests');
    console.log('   - Exponential backoff on errors');
    console.log('');

    const startTime = Date.now();
    const stats = await crawlAirbnbCommunity();
    const duration = Date.now() - startTime;

    // Get new count
    const newCount = await prisma.article.count({
      where: { platform: 'Airbnb' }
    });

    console.log('\n📈 ENHANCED CRAWL RESULTS');
    console.log('==========================');
    console.log(`Duration: ${(duration / 1000 / 60).toFixed(1)} minutes`);
    console.log(`Categories processed: ${stats.categoriesDiscovered}`);
    console.log(`Threads discovered: ${stats.threadsDiscovered}`);
    console.log(`Posts extracted: ${stats.postsExtracted}`);
    console.log(`Replies extracted: ${stats.repliesExtracted}`);
    console.log(`Total new content: ${stats.postsExtracted + stats.repliesExtracted}`);
    console.log(`Errors: ${stats.errors.length}`);
    console.log(`Success rate: ${stats.errors.length > 0 ? ((stats.postsExtracted + stats.repliesExtracted) / (stats.postsExtracted + stats.repliesExtracted + stats.errors.length) * 100).toFixed(1) : '100'}%`);
    console.log('');

    console.log('📊 DATABASE IMPACT');
    console.log('==================');
    console.log(`Before: ${currentCount.toLocaleString()} Airbnb articles`);
    console.log(`After: ${newCount.toLocaleString()} Airbnb articles`);
    console.log(`Growth: +${(newCount - currentCount).toLocaleString()} articles`);
    console.log(`Growth percentage: +${currentCount > 0 ? Math.round(((newCount - currentCount) / currentCount) * 100) : 0}%`);
    console.log('');

    // Show recent articles
    const recentArticles = await prisma.article.findMany({
      where: { platform: 'Airbnb' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        question: true,
        category: true,
        createdAt: true,
        answer: true
      }
    });

    console.log('🆕 RECENTLY ADDED ARTICLES');
    console.log('==========================');
    recentArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.question}`);
      console.log(`   Category: ${article.category}`);
      console.log(`   Content length: ${article.answer.length} characters`);
      console.log(`   Added: ${article.createdAt.toLocaleString()}`);
      console.log('');
    });

    // Show category breakdown
    const categoryBreakdown = await prisma.article.groupBy({
      by: ['category'],
      where: { platform: 'Airbnb' },
      _count: { category: true }
    });

    console.log('📂 CATEGORY BREAKDOWN');
    console.log('=====================');
    categoryBreakdown.forEach(item => {
      console.log(`${item.category}: ${item._count.category.toLocaleString()} articles`);
    });

    console.log('\n✅ Enhanced Airbnb Community crawl test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testEnhancedAirbnbCommunity(); 