import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRedditFallback() {
  console.log('🧪 TESTING REDDIT FALLBACK MECHANISM');
  console.log('=====================================\n');

  try {
    // Get current Reddit article count
    const currentCount = await prisma.article.count({
      where: { platform: 'Reddit' }
    });

    console.log(`📊 Current Reddit articles in database: ${currentCount.toLocaleString()}`);
    console.log('');

    // Test OAuth crawler first
    console.log('🔐 Testing OAuth Reddit crawler...');
    try {
      const { crawlRedditOAuth } = await import('../src/crawlers/reddit-oauth');
      const oauthStats = await crawlRedditOAuth();
      
      console.log('✅ OAuth Reddit crawler SUCCESSFUL');
      console.log(`   - Subreddits processed: ${oauthStats.subredditsProcessed}`);
      console.log(`   - Posts extracted: ${oauthStats.postsExtracted}`);
      console.log(`   - Comments extracted: ${oauthStats.commentsExtracted}`);
      
    } catch (oauthError: any) {
      console.log('❌ OAuth Reddit crawler FAILED');
      console.log(`   - Error: ${oauthError.message}`);
      
      // Test basic crawler as fallback
      console.log('\n🔄 Testing basic Reddit crawler as fallback...');
      try {
        const { crawlReddit } = await import('../src/crawlers/reddit');
        const basicStats = await crawlReddit();
        
        console.log('✅ Basic Reddit crawler SUCCESSFUL');
        console.log(`   - Subreddits processed: ${basicStats.subredditsProcessed}`);
        console.log(`   - Posts extracted: ${basicStats.postsExtracted}`);
        console.log(`   - Comments extracted: ${basicStats.commentsExtracted}`);
        
      } catch (basicError: any) {
        console.log('❌ Basic Reddit crawler also FAILED');
        console.log(`   - Error: ${basicError.message}`);
      }
    }

    // Get final count
    const finalCount = await prisma.article.count({
      where: { platform: 'Reddit' }
    });

    console.log('\n📈 RESULTS:');
    console.log('===========');
    console.log(`Articles before: ${currentCount.toLocaleString()}`);
    console.log(`Articles after: ${finalCount.toLocaleString()}`);
    console.log(`New articles: ${(finalCount - currentCount).toLocaleString()}`);

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testRedditFallback()
    .then(() => {
      console.log('\n✅ Reddit fallback test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Reddit fallback test failed:', error);
      process.exit(1);
    });
} 