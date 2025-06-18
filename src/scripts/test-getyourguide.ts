import { crawlGetYourGuideArticles } from '../crawlers/getyourguide';

async function main() {
  try {
    console.log('Starting GetYourGuide crawler test...');
    
    const articles = await crawlGetYourGuideArticles();
    
    console.log('\nResults:');
    articles.forEach(article => {
      console.log('\n---');
      console.log('URL:', article.url);
      console.log('Question:', article.question);
      console.log('Answer length:', article.answer.length, 'characters');
      console.log('First 100 chars of answer:', article.answer.substring(0, 100) + '...');
    });
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main(); 