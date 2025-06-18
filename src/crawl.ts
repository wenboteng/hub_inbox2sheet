import { crawlAirbnbArticles } from './crawlers/airbnb';
import { crawlViatorArticles } from './crawlers/viator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[CRAWLER] Starting crawl process');
  
  try {
    // Run Airbnb crawler
    const airbnbArticles = await crawlAirbnbArticles();
    console.log(`[CRAWLER] Crawled ${airbnbArticles.length} Airbnb articles`);
    
    // Run Viator crawler
    const viatorArticles = await crawlViatorArticles();
    console.log(`[CRAWLER] Crawled ${viatorArticles.length} Viator articles`);
    
    // Store all articles in database
    for (const article of [...airbnbArticles, ...viatorArticles]) {
      await prisma.answer.upsert({
        where: { sourceUrl: article.url },
        create: {
          question: article.question,
          answer: article.answer,
          firstAnswerParagraph: article.answer.split('\n')[0],
          sourceUrl: article.url,
          platform: article.platform,
          category: 'help-center',
          tags: [],
        },
        update: {
          question: article.question,
          answer: article.answer,
          firstAnswerParagraph: article.answer.split('\n')[0],
          platform: article.platform,
        },
      });
    }
    
    console.log('[CRAWLER] Successfully stored all articles in database');
  } catch (error) {
    console.error('[CRAWLER] Error during crawl process:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the crawler
main().catch(console.error); 