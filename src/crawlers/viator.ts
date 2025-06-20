import { fetchHtml } from '../utils/fetchHtml';
import { parseContent, cleanText, ParsedContent } from '../utils/parseHelpers';
import * as cheerio from 'cheerio';

const VIATOR_SELECTORS = {
  title: 'h1, .article-title, .help-center-title',
  content: '.article-content, .help-center-content, .article-body',
};

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
  const helpCenterUrl = 'https://www.viator.com/help/';
  console.log(`[VIATOR] Starting discovery from ${helpCenterUrl}`);
  const discoveredUrls = new Set<string>();

  try {
    const mainHtml = await fetchHtml(helpCenterUrl);
    const $ = cheerio.load(mainHtml);
    
    // This selector is a general guess for finding category links on a help center homepage.
    const categoryLinks: string[] = [];
    $('.support-topics a, .help-center-categories a, a[href*="/help/"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('/help')) { // Ensure we stay on the help domain
            categoryLinks.push(new URL(href, helpCenterUrl).toString());
        }
    });
    
    console.log(`[VIATOR] Discovered ${categoryLinks.length} potential category pages.`);
    
    for (const link of categoryLinks) {
        if (link.includes('/articles/')) {
            discoveredUrls.add(link);
        } else {
            // It's likely a category page, so we'll crawl it for article links.
            try {
                const categoryHtml = await fetchHtml(link);
                const $cat = cheerio.load(categoryHtml);
                $cat('a[href*="/articles/"]').each((i, el) => {
                    const articleHref = $(el).attr('href');
                    if (articleHref) {
                        discoveredUrls.add(new URL(articleHref, helpCenterUrl).toString());
                    }
                });
            } catch (error) {
                console.error(`[VIATOR] Failed to crawl category page ${link}:`, error);
            }
        }
    }
  } catch (error) {
    console.error(`[VIATOR] Failed to crawl main help page ${helpCenterUrl}:`, error);
  }

  const uniqueUrls = Array.from(discoveredUrls);
  console.log(`[VIATOR] Discovered ${uniqueUrls.length} unique article URLs.`);
  
  const results: ViatorArticle[] = [];
  
  for (const url of uniqueUrls) {
    try {
      const article = await crawlViatorArticle(url);
      results.push(article);
      // Add a small delay between requests to avoid being blocked
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`[VIATOR] Failed to crawl article ${url}:`, error);
    }
  }
  
  console.log(`[VIATOR] Completed crawl of ${results.length} articles.`);
  return results;
} 