import { PrismaClient } from '@prisma/client';
import { detectLanguage } from '../utils/languageDetection';
import { getEmbedding } from '../utils/openai';

const prisma = new PrismaClient();

interface Article {
  url: string;
  question: string;
  answer: string;
  platform: string;
  category: string;
  contentType: 'official' | 'community';
}

interface ParagraphWithEmbedding {
  text: string;
  embedding: number[];
}

async function getExistingArticleUrls(): Promise<Set<string>> {
  const articles = await prisma.article.findMany({ select: { url: true } });
  return new Set(articles.map(article => article.url));
}

async function generateUniqueSlug(title: string): Promise<string> {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 60);
  
  const existing = await prisma.article.findFirst({
    where: { slug: baseSlug }
  });
  
  if (!existing) return baseSlug;
  
  let counter = 1;
  while (true) {
    const newSlug = `${baseSlug}-${counter}`;
    const exists = await prisma.article.findFirst({
      where: { slug: newSlug }
    });
    if (!exists) return newSlug;
    counter++;
  }
}

async function scrapeViator(): Promise<Article[]> {
  console.log('[TERTIARY] Starting Viator scraping...');
  
  try {
    const { crawlViatorArticles } = await import('../crawlers/viator');
    const viatorArticles = await crawlViatorArticles();
    console.log(`[TERTIARY] Found ${viatorArticles.length} Viator articles`);
    
    // Convert to Article format
    const articles = viatorArticles.map(article => ({
      url: article.url,
      question: article.question,
      answer: article.answer,
      platform: 'Viator',
      category: 'Help Center',
      contentType: 'official' as const,
    }));
    
    return articles;
  } catch (error) {
    console.error('[TERTIARY] Viator scraping failed:', error);
    return [];
  }
}

async function scrapeGetYourGuide(): Promise<Article[]> {
  console.log('[TERTIARY] Starting GetYourGuide scraping...');
  
  try {
    const { crawlGetYourGuideArticlesWithPagination } = await import('../crawlers/getyourguide');
    const getyourguideArticles = await crawlGetYourGuideArticlesWithPagination();
    console.log(`[TERTIARY] Found ${getyourguideArticles.length} GetYourGuide articles`);
    
    // Convert to Article format
    const articles = getyourguideArticles.map(article => ({
      url: article.url,
      question: article.question,
      answer: article.answer,
      platform: 'GetYourGuide',
      category: article.category || 'Help Center',
      contentType: 'official' as const,
    }));
    
    return articles;
  } catch (error) {
    console.error('[TERTIARY] GetYourGuide scraping failed:', error);
    return [];
  }
}

async function scrapeExpedia(): Promise<Article[]> {
  console.log('[TERTIARY] Starting Expedia scraping...');
  
  try {
    const { crawlExpedia } = await import('../crawlers/expedia');
    const expediaArticles = await crawlExpedia();
    console.log(`[TERTIARY] Found ${expediaArticles.length} Expedia articles`);
    
    // Convert to Article format
    const articles = expediaArticles.map(article => ({
      url: article.url,
      question: article.question,
      answer: article.answer,
      platform: 'Expedia',
      category: article.category || 'Help Center',
      contentType: 'official' as const,
    }));
    
    return articles;
  } catch (error) {
    console.error('[TERTIARY] Expedia scraping failed:', error);
    return [];
  }
}

async function scrapeBooking(): Promise<Article[]> {
  console.log('[TERTIARY] Starting Booking.com scraping...');
  
  try {
    const { crawlBooking } = await import('../crawlers/booking');
    const bookingArticles = await crawlBooking();
    console.log(`[TERTIARY] Found ${bookingArticles.length} Booking.com articles`);
    
    // Convert to Article format
    const articles = bookingArticles.map(article => ({
      url: article.url,
      question: article.question,
      answer: article.answer,
      platform: 'Booking.com',
      category: article.category || 'Help Center',
      contentType: 'official' as const,
    }));
    
    return articles;
  } catch (error) {
    console.error('[TERTIARY] Booking.com scraping failed:', error);
    return [];
  }
}

async function main() {
  console.log('[TERTIARY] Starting tertiary scraping (Viator, GetYourGuide, Expedia, Booking)...');
  
  try {
    // Get existing URLs to avoid duplicates
    const existingUrls = await getExistingArticleUrls();
    console.log(`[TERTIARY] Found ${existingUrls.size} existing articles`);
    
    let allNewArticles: Article[] = [];
    
    // 1. Scrape Viator
    console.log('[TERTIARY] ===== VIATOR SCRAPING =====');
    const viatorArticles = await scrapeViator();
    const newViatorArticles = viatorArticles.filter(article => !existingUrls.has(article.url));
    console.log(`[TERTIARY] ${newViatorArticles.length} new Viator articles`);
    allNewArticles = allNewArticles.concat(newViatorArticles);
    
    // 2. Scrape GetYourGuide
    console.log('[TERTIARY] ===== GETYOURGUIDE SCRAPING =====');
    const getYourGuideArticles = await scrapeGetYourGuide();
    const newGetYourGuideArticles = getYourGuideArticles.filter(article => !existingUrls.has(article.url));
    console.log(`[TERTIARY] ${newGetYourGuideArticles.length} new GetYourGuide articles`);
    allNewArticles = allNewArticles.concat(newGetYourGuideArticles);
    
    // 3. Scrape Expedia
    console.log('[TERTIARY] ===== EXPEDIA SCRAPING =====');
    const expediaArticles = await scrapeExpedia();
    const newExpediaArticles = expediaArticles.filter(article => !existingUrls.has(article.url));
    console.log(`[TERTIARY] ${newExpediaArticles.length} new Expedia articles`);
    allNewArticles = allNewArticles.concat(newExpediaArticles);
    
    // 4. Scrape Booking.com
    console.log('[TERTIARY] ===== BOOKING.COM SCRAPING =====');
    const bookingArticles = await scrapeBooking();
    const newBookingArticles = bookingArticles.filter(article => !existingUrls.has(article.url));
    console.log(`[TERTIARY] ${newBookingArticles.length} new Booking.com articles`);
    allNewArticles = allNewArticles.concat(newBookingArticles);
    
    console.log(`[TERTIARY] Total new articles to save: ${allNewArticles.length}`);
    
    // Save all new articles to database
    for (const article of allNewArticles) {
      try {
        // Generate unique slug
        const slug = await generateUniqueSlug(article.question);
        
        // Detect language
        const languageDetection = detectLanguage(article.answer);
        
        // Generate embeddings for content
        const paragraphs = article.answer.split('\n\n').filter(p => p.trim().length > 50);
        const paragraphsWithEmbeddings: ParagraphWithEmbedding[] = [];
        
        for (const paragraph of paragraphs.slice(0, 5)) {
          try {
            const embedding = await getEmbedding(paragraph);
            paragraphsWithEmbeddings.push({ text: paragraph, embedding });
          } catch (error) {
            console.error(`[TERTIARY] Error generating embedding for paragraph:`, error);
          }
        }
        
        // Create article
        const created = await prisma.article.create({
          data: {
            url: article.url,
            question: article.question,
            answer: article.answer,
            slug,
            category: article.category,
            platform: article.platform,
            contentType: article.contentType,
            source: 'community',
            language: languageDetection.language,
            crawlStatus: 'active',
          }
        });
        
        // Create paragraphs if embeddings were generated
        if (paragraphsWithEmbeddings.length > 0) {
          await prisma.articleParagraph.createMany({
            data: paragraphsWithEmbeddings.map(p => ({
              articleId: created.id,
              text: p.text,
              embedding: p.embedding as any,
            })),
          });
          console.log(`[TERTIARY] Created ${paragraphsWithEmbeddings.length} paragraph embeddings`);
        }
        
        console.log(`[TERTIARY] Saved article: ${article.question}`);
      } catch (error) {
        console.error(`[TERTIARY] Error saving article ${article.url}:`, error);
      }
    }
    
    // Log final statistics
    const totalArticles = await prisma.article.count();
    const todayArticles = await prisma.article.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });
    
    console.log('\n[TERTIARY] SCRAPING STATISTICS:');
    console.log('==============================');
    console.log(`Total articles in database: ${totalArticles.toLocaleString()}`);
    console.log(`Articles added today: ${todayArticles}`);
    console.log(`New articles this run: ${allNewArticles.length}`);
    console.log(`Viator articles: ${newViatorArticles.length}`);
    console.log(`GetYourGuide articles: ${newGetYourGuideArticles.length}`);
    console.log(`Expedia articles: ${newExpediaArticles.length}`);
    console.log(`Booking.com articles: ${newBookingArticles.length}`);
    
  } catch (error) {
    console.error('[TERTIARY] Error in tertiary scraping function:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().then(() => {
    console.log('[TERTIARY] Tertiary scraping completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('[TERTIARY] Tertiary scraping failed:', error);
    process.exit(1);
  });
} 