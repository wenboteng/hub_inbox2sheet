import { PrismaClient } from '@prisma/client';
import { getContentEmbeddings } from '@/utils/openai';
import { scrapeAirbnb } from '@/scripts/scrapers/airbnb';
import { scrapeGetYourGuide } from '@/scripts/scrapers/getyourguide';

const prisma = new PrismaClient();

// List of URLs to scrape
const URLs = [
  // GetYourGuide supplier help center articles
  'https://supply.getyourguide.support/hc/en-us/articles/13980989354141-Self-canceling-bookings',
  'https://supply.getyourguide.support/hc/en-us/articles/13980989354141-How-do-I-modify-a-booking',
  'https://supply.getyourguide.support/hc/en-us/articles/13980989354141-How-do-I-issue-a-refund'
];

async function main() {
  try {
    console.log('Starting scrape...');

    // Scrape articles from different platforms
    const airbnbArticles = await scrapeAirbnb();
    const gygArticles = await scrapeGetYourGuide();
    const articles = [...airbnbArticles, ...gygArticles];

    console.log(`Found ${articles.length} articles`);

    // Process each article
    for (const article of articles) {
      console.log(`Processing article: ${article.question}`);

      // Generate embeddings for paragraphs
      const paragraphsWithEmbeddings = await getContentEmbeddings(article.answer);

      // Upsert article (without paragraphs)
      const upserted = await prisma.article.upsert({
        where: { url: article.url },
        update: {
          question: article.question,
          answer: article.answer,
          category: article.category,
          platform: article.platform,
          lastUpdated: new Date(),
        },
        create: {
          url: article.url,
          question: article.question,
          answer: article.answer,
          category: article.category,
          platform: article.platform,
        },
      });

      // Delete old paragraphs
      await prisma.articleParagraph.deleteMany({ where: { articleId: upserted.id } });

      // Create new paragraphs
      if (paragraphsWithEmbeddings.length > 0) {
        await prisma.articleParagraph.createMany({
          data: paragraphsWithEmbeddings.map(p => ({
            articleId: upserted.id,
            text: p.text,
            embedding: p.embedding,
          })),
        });
      }
    }

    console.log('Scrape completed successfully');
  } catch (error) {
    console.error('Error during scrape:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 