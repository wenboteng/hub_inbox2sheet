import { oxylabsScraper } from '../lib/oxylabs';
import * as dotenv from 'dotenv';

dotenv.config();

async function testOxylabsSearch() {
  console.log('🔍 Testing Oxylabs Search Functionality...');
  
  try {
    // Test 1: Google Search
    console.log('\n1️⃣ Testing Google Search...');
    const googleResults = await oxylabsScraper.searchContent('tour operator pricing strategies', 'google', 3);
    console.log(`   Google results: ${googleResults.length}`);
    
    if (googleResults.length > 0) {
      console.log('   First result:');
      console.log(`   - Title: ${googleResults[0].title}`);
      console.log(`   - URL: ${googleResults[0].url}`);
      console.log(`   - Content length: ${googleResults[0].content.length}`);
    }
    
    // Test 2: Bing Search
    console.log('\n2️⃣ Testing Bing Search...');
    const bingResults = await oxylabsScraper.searchContent('tour operator pricing strategies', 'bing', 3);
    console.log(`   Bing results: ${bingResults.length}`);
    
    if (bingResults.length > 0) {
      console.log('   First result:');
      console.log(`   - Title: ${bingResults[0].title}`);
      console.log(`   - URL: ${bingResults[0].url}`);
      console.log(`   - Content length: ${bingResults[0].content.length}`);
    }
    
    // Test 3: Different query
    console.log('\n3️⃣ Testing different query...');
    const differentResults = await oxylabsScraper.searchContent('airbnb host tips', 'google', 2);
    console.log(`   Different query results: ${differentResults.length}`);
    
    if (differentResults.length > 0) {
      console.log('   First result:');
      console.log(`   - Title: ${differentResults[0].title}`);
      console.log(`   - URL: ${differentResults[0].url}`);
      console.log(`   - Content length: ${differentResults[0].content.length}`);
    }
    
    console.log('\n✅ Search testing completed!');
    
  } catch (error: any) {
    console.error('❌ Search test failed:', error.message);
    console.error('Error details:', error.response?.data || error);
  }
}

// Run the test
testOxylabsSearch().catch(console.error); 