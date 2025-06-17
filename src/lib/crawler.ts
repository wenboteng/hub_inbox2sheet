import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Basic browser headers to avoid being blocked
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

// Platform-specific scraper configurations
interface ScraperConfig {
  name: string;
  baseUrl: string;
  selectors: {
    title: string;
    content: string;
  };
  // Optional function to transform URLs before scraping
  transformUrl?: (url: string) => string;
  // Optional function to clean extracted content
  cleanContent?: (content: string) => string;
}

const SCRAPER_CONFIGS: Record<string, ScraperConfig> = {
  airbnb: {
    name: 'Airbnb',
    baseUrl: 'https://www.airbnb.com/help/',
    selectors: {
      title: 'h1, .article-title, .help-center-article-title',
      content: '.article-body, .help-center-article-body, .article-content',
    },
    cleanContent: (content: string) => content.replace(/\s+/g, ' ').trim(),
  },
  booking: {
    name: 'Booking.com',
    baseUrl: 'https://partner.booking.com/en-us/help/',
    selectors: {
      title: 'h1, .article-title, .help-center-title',
      content: '.article-content, .help-center-content, .article-body',
    },
  },
  getyourguide: {
    name: 'GetYourGuide',
    baseUrl: 'https://supplier.getyourguide.com/help/',
    selectors: {
      title: 'h1, .article-title, .help-center-title',
      content: '.article-content, .help-center-content, .article-body',
    },
  },
  expedia: {
    name: 'Expedia',
    baseUrl: 'https://apps.expediapartnercentral.com/help/',
    selectors: {
      title: 'h1, .article-title, .help-center-title',
      content: '.article-content, .help-center-content, .article-body',
    },
  },
};

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to get random delay between 2-5 seconds
const getRandomDelay = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function scrapePage(url: string, config: ScraperConfig): Promise<void> {
  try {
    console.log(`[SCRAPER] Scraping ${url} (${config.name})`);
    
    const response = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: 10000,
    });

    if (response.status !== 200) {
      console.log(`[SCRAPER][WARN] Non-200 status code (${response.status}) for ${url}`);
      return;
    }

    const $ = cheerio.load(response.data);
    
    // Extract title and content
    const title = $(config.selectors.title).first().text().trim();
    const content = $(config.selectors.content).first().text().trim();
    
    // Log what we found
    console.log(`[SCRAPER][DEBUG] Page title: ${title}`);
    console.log(`[SCRAPER][DEBUG] Content length: ${content.length} characters`);
    
    if (!title) {
      console.log(`[SCRAPER][WARN] No title found at ${url}`);
      console.log(`[SCRAPER][DEBUG] Available headers:`, $('h1, h2, h3').map((_, el) => $(el).text().trim()).get());
      return;
    }

    if (!content) {
      console.log(`[SCRAPER][WARN] No content found for title: ${title}`);
      return;
    }

    // Clean content if needed
    const cleanedContent = config.cleanContent ? config.cleanContent(content) : content;
    
    // Extract first paragraph for summary
    const firstParagraph = $(config.selectors.content)
      .find('p')
      .first()
      .text()
      .trim();

    // Store in database
    await prisma.answer.upsert({
      where: { sourceUrl: url },
      create: {
        question: title,
        answer: cleanedContent,
        firstAnswerParagraph: firstParagraph,
        sourceUrl: url,
        platform: config.name,
        category: 'help-center',
        tags: [],
      },
      update: {
        question: title,
        answer: cleanedContent,
        firstAnswerParagraph: firstParagraph,
        platform: config.name,
      },
    });

    console.log(`[SCRAPER] Successfully processed: ${url}`);
    
    // Add a random delay between 2-5 seconds before the next request
    await delay(getRandomDelay(2000, 5000));
  } catch (error) {
    console.error(`[SCRAPER] Error scraping ${url}:`, error);
  }
}

// Main function to scrape a list of URLs
export async function scrapeUrls(urls: string[]): Promise<void> {
  console.log(`[SCRAPER] Starting scrape of ${urls.length} URLs`);
  
  for (const url of urls) {
    // Determine which scraper config to use based on URL
    const platform = Object.values(SCRAPER_CONFIGS).find(config => 
      url.includes(config.baseUrl)
    );
    
    if (!platform) {
      console.log(`[SCRAPER][WARN] No scraper config found for URL: ${url}`);
      continue;
    }
    
    await scrapePage(url, platform);
  }
  
  console.log('[SCRAPER] Scrape process completed');
}

// Example usage:
// await scrapeUrls([
//   'https://www.airbnb.com/help/article/123',
//   'https://partner.booking.com/en-us/help/article/456',
// ]); 