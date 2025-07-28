import { OxylabsScraper } from '../lib/oxylabs';

async function testOxylabsConnection() {
  console.log('🧪 Testing Oxylabs API Connection...');
  
  try {
    const scraper = new OxylabsScraper();
    
    // Test 1: Check credentials
    console.log('1️⃣ Checking credentials...');
    console.log(`   Username: ${process.env.OXYLABS_USERNAME ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Password: ${process.env.OXYLABS_PASSWORD ? '✅ Set' : '❌ Missing'}`);
    
    // Test 2: Try a simple request
    console.log('\n2️⃣ Testing simple request...');
    const testUrl = 'https://httpbin.org/html';
    console.log(`   Testing URL: ${testUrl}`);
    
    const result = await scraper.scrapeUrl(testUrl, 'universal');
    
    if (result) {
      console.log('   ✅ Success! Got response');
      console.log(`   Title: ${result.title}`);
      console.log(`   Content length: ${result.content.length} characters`);
    } else {
      console.log('   ❌ Failed to get response');
    }
    
    // Test 3: Check usage stats
    console.log('\n3️⃣ Checking usage stats...');
    try {
      const stats = await scraper.getUsageStats();
      console.log('   ✅ Usage stats retrieved');
      console.log(`   Stats: ${JSON.stringify(stats, null, 2)}`);
    } catch (error: any) {
      console.log('   ❌ Failed to get usage stats:', error.message);
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.response?.data || error.message);
  }
}

// Run the test
testOxylabsConnection().catch(console.error); 