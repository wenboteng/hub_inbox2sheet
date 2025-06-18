import { crawlAirbnbArticles } from '../crawlers/airbnb';

async function main() {
  console.log('Starting Airbnb crawler test...');
  console.log('Testing with verified help center articles...\n');

  try {
    const articles = await crawlAirbnbArticles();
    console.log('\n✅ Test completed successfully! Crawled', articles.length, 'articles.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main(); 