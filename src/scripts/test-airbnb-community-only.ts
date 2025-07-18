import { scrapeAirbnbCommunity } from './scrape';

async function testAirbnbCommunityOnly() {
  console.log('🧪 Testing Airbnb Community scraper only...');
  
  try {
    const articles = await scrapeAirbnbCommunity();
    
    console.log('\n📊 RESULTS:');
    console.log(`Total articles found: ${articles.length}`);
    
    // Group by category to see distribution
    const categoryStats = articles.reduce((acc, article) => {
      acc[article.category] = (acc[article.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nCategory breakdown:');
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} articles`);
    });
    
    // Check for duplicate URLs
    const urls = articles.map(a => a.url);
    const uniqueUrls = new Set(urls);
    const duplicateCount = urls.length - uniqueUrls.size;
    
    console.log(`\nDuplicate check: ${duplicateCount} duplicate URLs found`);
    
    if (duplicateCount > 0) {
      console.log('\n❌ DUPLICATE URLs FOUND:');
      const urlCounts = urls.reduce((acc, url) => {
        acc[url] = (acc[url] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(urlCounts)
        .filter(([_, count]) => count > 1)
        .forEach(([url, count]) => {
          console.log(`  ${url} (${count} times)`);
        });
    } else {
      console.log('✅ No duplicate URLs found!');
    }
    
    // Show sample articles
    console.log('\n📝 Sample articles:');
    articles.slice(0, 5).forEach((article, index) => {
      console.log(`\n${index + 1}. ${article.question}`);
      console.log(`   Category: ${article.category}`);
      console.log(`   URL: ${article.url}`);
      console.log(`   Content length: ${article.answer.length} chars`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAirbnbCommunityOnly(); 