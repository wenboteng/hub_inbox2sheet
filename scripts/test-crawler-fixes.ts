import { crawlViatorArticles } from '../src/crawlers/viator';
import { crawlStackOverflow } from '../src/crawlers/stackoverflow';
import { crawlAirHostsForum } from '../src/crawlers/airhosts-forum';

async function testCrawlerFixes() {
  console.log('🧪 TESTING CRAWLER FIXES');
  console.log('========================\n');

  // Test 1: Viator Crawler (403 errors fix)
  console.log('1️⃣ Testing Viator Crawler (403 errors fix)...');
  try {
    const viatorArticles = await crawlViatorArticles();
    console.log(`✅ Viator: Found ${viatorArticles.length} articles`);
    
    if (viatorArticles.length > 0) {
      console.log(`   Sample article: "${viatorArticles[0].question}"`);
    }
  } catch (error) {
    console.error(`❌ Viator test failed:`, error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Stack Overflow Crawler (rate limiting fix)
  console.log('2️⃣ Testing Stack Overflow Crawler (rate limiting fix)...');
  try {
    const stackOverflowPosts = await crawlStackOverflow();
    console.log(`✅ Stack Overflow: Found ${stackOverflowPosts.length} posts`);
    
    if (stackOverflowPosts.length > 0) {
      console.log(`   Sample post: "${stackOverflowPosts[0].question}"`);
    }
  } catch (error) {
    console.error(`❌ Stack Overflow test failed:`, error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: AirHosts Forum Crawler (timeout fix)
  console.log('3️⃣ Testing AirHosts Forum Crawler (timeout fix)...');
  try {
    const airHostsPosts = await crawlAirHostsForum();
    console.log(`✅ AirHosts Forum: Found ${airHostsPosts.length} posts`);
    
    if (airHostsPosts.length > 0) {
      console.log(`   Sample post: "${airHostsPosts[0].question}"`);
    }
  } catch (error) {
    console.error(`❌ AirHosts Forum test failed:`, error);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Crawler fix testing completed!');
}

// Run the test
testCrawlerFixes().catch(console.error); 