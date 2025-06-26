import { PrismaClient } from '@prisma/client';
import { crawlExpedia } from '@/crawlers/expedia';

const prisma = new PrismaClient();

async function testNewSources() {
  console.log('🧪 TESTING NEW SOURCES');
  console.log('======================\n');

  try {
    const existingArticles = await prisma.article.findMany({
      select: { url: true },
    });
    const existingUrlSet = new Set(existingArticles.map(a => a.url));
    console.log(`📊 Found ${existingUrlSet.size} existing articles`);

    // Test Expedia
    console.log('\n🔧 Testing Expedia...');
    try {
      const expediaArticles = await crawlExpedia();
      console.log(`✅ Expedia: ${expediaArticles.length} articles found`);
      
      if (expediaArticles.length > 0) {
        console.log('📋 Sample Expedia articles:');
        expediaArticles.slice(0, 3).forEach(article => {
          console.log(`   - ${article.question}`);
        });
      }
    } catch (error) {
      console.log(`❌ Expedia test failed: ${error}`);
    }

    console.log('\n✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewSources(); 