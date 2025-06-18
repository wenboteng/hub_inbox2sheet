import puppeteer from 'puppeteer';

interface Article {
  url: string;
  question: string;
  answer: string;
  platform: string;
  category: string;
}

export async function scrapeAirbnb(): Promise<Article[]> {
  const articles: Article[] = [];
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://www.airbnb.com/help/article-categories/hosting');

    // Get all article links
    const articleLinks = await page.$$eval('a[href*="/help/article/"]', links =>
      links.map(link => ({
        url: link.href,
        title: link.textContent?.trim() || '',
      }))
    );

    // Process each article
    for (const { url, title } of articleLinks) {
      try {
        await page.goto(url);

        // Wait for content to load
        await page.waitForSelector('article');

        // Extract article content
        const content = await page.$eval('article', el => el.textContent?.trim() || '');

        // Get category from breadcrumb
        const category = await page.$eval('.breadcrumb', el => 
          el.textContent?.split('>').pop()?.trim() || 'Help Center'
        );

        articles.push({
          url,
          question: title,
          answer: content,
          platform: 'Airbnb',
          category,
        });
      } catch (error) {
        console.error(`Error scraping article ${url}:`, error);
      }
    }
  } finally {
    await browser.close();
  }

  return articles;
} 