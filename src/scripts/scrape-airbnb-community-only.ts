import { PrismaClient } from '@prisma/client';
import { validateArticle } from '../lib/validation';
import { slugify } from '@/utils/slugify';
import { createBrowser } from '@/utils/puppeteer';

const prisma = new PrismaClient();

interface Article {
  url: string;
  question: string;
  answer: string;
  platform: string;
  category: string;
}

async function scrapeAirbnbCommunity(): Promise<Article[]> {
  console.log('[AIRBNB-COMMUNITY-ONLY] Starting comprehensive Airbnb Community scraping...');
  const articles: Article[] = [];
  const browser = await createBrowser();
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setDefaultTimeout(60000);

    const communityCategories = [
      'https://community.withairbnb.com/t5/Community-Center/ct-p/community-center',
      'https://community.withairbnb.com/t5/Hosting/ct-p/hosting',
      'https://community.withairbnb.com/t5/Guests/ct-p/guests',
      'https://community.withairbnb.com/t5/Experiences/ct-p/experiences',
    ];

    for (const categoryUrl of communityCategories) {
      console.log(`[AIRBNB-COMMUNITY-ONLY] Scraping category: ${categoryUrl}`);
      await page.goto(categoryUrl, { waitUntil: 'domcontentloaded' });
      
      const threadLinks = await page.$$eval('a[href*="/td-p/"]', link => link.map(a => ({
        url: (a as HTMLAnchorElement).href,
        title: a.textContent?.trim() || ''
      })));
      
      console.log(`[AIRBNB-COMMUNITY-ONLY] Found ${threadLinks.length} threads in this category.`);

      for (const { url, title } of threadLinks.slice(0, 5)) { // Scrape 5 threads per category for this test
        try {
          console.log(`[AIRBNB-COMMUNITY-ONLY] Navigating to thread: ${title}`);
          await page.goto(url, { waitUntil: 'domcontentloaded' });
          const extracted = await page.evaluate(() => {
            const titleElement = document.querySelector('.lia-message-subject-text');
            const contentElements = document.querySelectorAll('.lia-message-body-content');
            const title = titleElement?.textContent?.trim() || '';
            const content = Array.from(contentElements).map(el => el.textContent?.trim()).join('\n\n');
            return { title, content };
          });

          if (extracted.title && extracted.content) {
            articles.push({
              url,
              question: extracted.title,
              answer: extracted.content,
              platform: 'Airbnb',
              category: 'Community',
            });
            console.log(`[AIRBNB-COMMUNITY-ONLY] Successfully scraped: ${extracted.title}`);
          }
        } catch (e) {
            console.error(`[AIRBNB-COMMUNITY-ONLY] Failed to scrape thread ${title}`, e);
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  } finally {
    await browser.close();
  }
  return articles;
}

async function main() {
  console.log('[AIRBNB-COMMUNITY-ONLY] Starting focused scrape process.');
  await prisma.$connect();
  const existingUrls = new Set((await prisma.article.findMany({ select: { url: true } })).map((a: { url: string }) => a.url));
  console.log(`[AIRBNB-COMMUNITY-ONLY] Found ${existingUrls.size} existing articles.`);

  const articles = await scrapeAirbnbCommunity();
  const newArticles = articles.filter(a => !existingUrls.has(a.url));
  console.log(`[AIRBNB-COMMUNITY-ONLY] Found ${newArticles.length} new articles to insert.`);

  for (const article of newArticles) {
    const { isValid, issues } = validateArticle(article);
    if (!isValid) {
      console.warn(`[AIRBNB-COMMUNITY-ONLY] Invalid article, skipping. Issues: ${issues.join(', ')}`);
      continue;
    }
    await prisma.article.create({
      data: {
        ...article,
        slug: slugify(article.question),
        contentType: 'community',
        source: 'community_forum',
      }
    });
    console.log(`[AIRBNB-COMMUNITY-ONLY] Inserted: ${article.question}`);
  }

  console.log('[AIRBNB-COMMUNITY-ONLY] Focused scrape process completed.');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('[AIRBNB-COMMUNITY-ONLY] An unexpected error occurred:', e);
  process.exit(1);
}); 