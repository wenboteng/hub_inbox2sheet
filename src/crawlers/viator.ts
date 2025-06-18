import { fetchHtml } from '../utils/fetchHtml';
import { parseContent, cleanText, ParsedContent } from '../utils/parseHelpers';

const VIATOR_SELECTORS = {
  title: 'h1, .article-title, .help-center-title',
  content: '.article-content, .help-center-content, .article-body',
};

// Initial set of Viator help articles to crawl
const VIATOR_ARTICLES = [
  'https://www.viator.com/help/articles/1073', // How to cancel a booking
  'https://www.viator.com/help/articles/1074', // How to request a refund
  'https://www.viator.com/help/articles/1075', // How to contact customer service
  'https://www.viator.com/help/articles/1076', // How to modify a booking
  'https://www.viator.com/help/articles/1077', // How to leave a review
];

export interface ViatorArticle {
  platform: 'Viator';
  url: string;
  question: string;
  answer: string;
  rawHtml?: string;
}

export async function crawlViatorArticle(url: string): Promise<ViatorArticle> {
  console.log(`[VIATOR] Crawling ${url}`);
  
  const html = await fetchHtml(url);
  const parsed = parseContent(html, VIATOR_SELECTORS);
  
  if (!parsed.title || !parsed.content) {
    console.log(`[VIATOR] Warning: Missing content for ${url}`);
    console.log(`[VIATOR] Title found: ${parsed.title ? 'Yes' : 'No'}`);
    console.log(`[VIATOR] Content length: ${parsed.content.length}`);
  }
  
  return {
    platform: 'Viator',
    url,
    question: parsed.title,
    answer: cleanText(parsed.content),
    rawHtml: parsed.rawHtml,
  };
}

export async function crawlViatorArticles(): Promise<ViatorArticle[]> {
  console.log('[VIATOR] Starting crawl of Viator articles');
  
  const results: ViatorArticle[] = [];
  
  for (const url of VIATOR_ARTICLES) {
    try {
      const article = await crawlViatorArticle(url);
      results.push(article);
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[VIATOR] Failed to crawl ${url}:`, error);
    }
  }
  
  console.log(`[VIATOR] Completed crawl of ${results.length} articles`);
  return results;
} 