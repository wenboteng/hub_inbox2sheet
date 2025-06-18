import axios from 'axios';
import * as cheerio from 'cheerio';

interface Article {
  url: string;
  question: string;
  answer: string;
  platform: string;
  category: string;
}

export async function scrapeGetYourGuide(): Promise<Article[]> {
  const articles: Article[] = [];
  const baseUrl = 'https://supply.getyourguide.support';

  try {
    // Get the main help center page
    const response = await axios.get(baseUrl);
    const $ = cheerio.load(response.data);

    // Get all category links
    const categoryLinks = $('a[href*="/categories/"]')
      .map((_, el) => ({
        url: new URL($(el).attr('href') || '', baseUrl).toString(),
        category: $(el).text().trim(),
      }))
      .get();

    // Process each category
    for (const { url: categoryUrl, category } of categoryLinks) {
      try {
        const categoryResponse = await axios.get(categoryUrl);
        const $category = cheerio.load(categoryResponse.data);

        // Get all article links in this category
        const articleLinks = $category('a[href*="/articles/"]')
          .map((_, el) => ({
            url: new URL($category(el).attr('href') || '', baseUrl).toString(),
            title: $category(el).text().trim(),
          }))
          .get();

        // Process each article
        for (const { url, title } of articleLinks) {
          try {
            const articleResponse = await axios.get(url);
            const $article = cheerio.load(articleResponse.data);

            // Extract article content
            const content = $article('article').text().trim();

            articles.push({
              url,
              question: title,
              answer: content,
              platform: 'GetYourGuide',
              category,
            });
          } catch (error) {
            console.error(`Error scraping article ${url}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error scraping category ${categoryUrl}:`, error);
      }
    }
  } catch (error) {
    console.error('Error scraping GetYourGuide help center:', error);
  }

  return articles;
} 