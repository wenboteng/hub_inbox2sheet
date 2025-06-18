import { fetchHtml } from '../utils/fetchHtml';
import { parseContent, cleanText, ParsedContent } from '../utils/parseHelpers';

const AIRBNB_SELECTORS = {
  title: 'h1, .article-title, .help-center-article-title',
  content: '.article-body, .help-center-article-body, .article-content',
};

// Initial set of Airbnb help articles to crawl
const AIRBNB_ARTICLES = [
  'https://www.airbnb.com/help/article/3218', // How to cancel a reservation
  'https://www.airbnb.com/help/article/3219', // How to request a refund
  'https://www.airbnb.com/help/article/3220', // How to contact your host
  'https://www.airbnb.com/help/article/3221', // How to update your reservation
  'https://www.airbnb.com/help/article/3222', // How to leave a review
];

export interface AirbnbArticle {
  platform: 'Airbnb';
  url: string;
  question: string;
  answer: string;
  rawHtml?: string;
}

export async function crawlAirbnbArticle(url: string): Promise<AirbnbArticle> {
  console.log(`[AIRBNB] Crawling ${url}`);
  
  const html = await fetchHtml(url);
  const parsed = parseContent(html, AIRBNB_SELECTORS);
  
  if (!parsed.title || !parsed.content) {
    console.log(`[AIRBNB] Warning: Missing content for ${url}`);
    console.log(`[AIRBNB] Title found: ${parsed.title ? 'Yes' : 'No'}`);
    console.log(`[AIRBNB] Content length: ${parsed.content.length}`);
  }
  
  return {
    platform: 'Airbnb',
    url,
    question: parsed.title,
    answer: cleanText(parsed.content),
    rawHtml: parsed.rawHtml,
  };
}

export async function crawlAirbnbArticles(): Promise<AirbnbArticle[]> {
  console.log('[AIRBNB] Starting crawl of Airbnb articles');
  
  const results: AirbnbArticle[] = [];
  
  for (const url of AIRBNB_ARTICLES) {
    try {
      const article = await crawlAirbnbArticle(url);
      results.push(article);
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[AIRBNB] Failed to crawl ${url}:`, error);
    }
  }
  
  console.log(`[AIRBNB] Completed crawl of ${results.length} articles`);
  return results;
} 