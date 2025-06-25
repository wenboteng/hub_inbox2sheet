#!/usr/bin/env tsx

import { crawlNewsAndPolicies, getHighPriorityArticles } from '../src/crawlers/news-policy';
import { scrapeCommunityUrls, getCommunityContentUrls } from '../src/lib/communityCrawler';

async function testEnhancedCrawling() {
  console.log('🧪 Testing Enhanced Crawling System');
  console.log('====================================');
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  try {
    // Test 1: Community URLs
    console.log('\n📋 Test 1: Community URLs');
    console.log('-------------------------');
    const communityUrls = await getCommunityContentUrls();
    console.log(`✅ Found ${communityUrls.length} community URLs`);
    console.log('Sample URLs:');
    communityUrls.slice(0, 3).forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });

    // Test 2: News and Policy Crawling
    console.log('\n📰 Test 2: News and Policy Crawling');
    console.log('-----------------------------------');
    try {
      const newsArticles = await crawlNewsAndPolicies();
      console.log(`✅ Found ${newsArticles.length} news/policy articles`);
      
      if (newsArticles.length > 0) {
        console.log('Sample articles:');
        newsArticles.slice(0, 3).forEach((article, index) => {
          console.log(`  ${index + 1}. ${article.title} (${article.priority} priority)`);
          console.log(`     Platform: ${article.platform}`);
          console.log(`     Type: ${article.contentType}`);
        });
      }
    } catch (error) {
      console.log(`❌ News crawling failed: ${error}`);
    }

    // Test 3: High Priority Articles
    console.log('\n🎯 Test 3: High Priority Articles');
    console.log('--------------------------------');
    try {
      const highPriorityArticles = await getHighPriorityArticles();
      console.log(`✅ Found ${highPriorityArticles.length} high-priority articles`);
      
      if (highPriorityArticles.length > 0) {
        console.log('High priority articles:');
        highPriorityArticles.forEach((article, index) => {
          console.log(`  ${index + 1}. ${article.title}`);
          console.log(`     Platform: ${article.platform}`);
          console.log(`     Priority: ${article.priority}`);
        });
      }
    } catch (error) {
      console.log(`❌ High priority articles failed: ${error}`);
    }

    // Test 4: Outreach API
    console.log('\n📧 Test 4: Outreach API');
    console.log('----------------------');
    try {
      const response = await fetch('http://localhost:3000/api/outreach?priority=high&limit=5');
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Outreach API working: ${data.total} articles found`);
      } else {
        console.log(`❌ Outreach API failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Outreach API test failed: ${error}`);
    }

    console.log('\n✅ Enhanced crawling tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEnhancedCrawling()
  .catch((error) => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  }); 