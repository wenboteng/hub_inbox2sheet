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
  selectors?: {
    title: string;
    content: string;
  };
  // Optional function to transform URLs before scraping
  transformUrl?: (url: string) => string;
  // Optional function to clean extracted content
  cleanContent?: (content: string) => string;
  // Optional function to fetch content using API
  fetchContent?: (url: string) => Promise<{ title: string; content: string }>;
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
    // Use Booking.com Partner API instead of web scraping
    fetchContent: async (url: string) => {
      const articleId = url.split('/').pop();
      const response = await axios.get(
        `https://distribution-xml.booking.com/json/bookings.getHelpArticle`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.BOOKING_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          params: {
            article_id: articleId,
          },
        }
      );
      
      return {
        title: response.data.title,
        content: response.data.content,
      };
    },
  },
  getyourguide: {
    name: 'GetYourGuide',
    baseUrl: 'https://support.getyourguide.com/s/',
    selectors: {
      title: 'h1',
      content: 'div[class*="slds-rich-text-editor__output"]',
    },
    cleanContent: (content: string) => content.replace(/\s+/g, ' ').trim(),
  },
  expedia: {
    name: 'Expedia',
    baseUrl: 'https://apps.expediapartnercentral.com/help/',
    // Use Expedia Partner API instead of web scraping
    fetchContent: async (url: string) => {
      const articleId = url.split('/').pop();
      const response = await axios.get(
        `https://api.ean.com/v3/help/articles/${articleId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.EXPEDIA_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return {
        title: response.data.title,
        content: response.data.content,
      };
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
    
    let title: string;
    let content: string;

    if (config.fetchContent) {
      // Use API to fetch content
      const result = await config.fetchContent(url);
      title = result.title;
      content = result.content;
    } else {
      // Use web scraping
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
      title = $(config.selectors!.title).first().text().trim();
      content = $(config.selectors!.content).first().text().trim();
    }
    
    // Log what we found
    console.log(`[SCRAPER][DEBUG] Page title: ${title}`);
    console.log(`[SCRAPER][DEBUG] Content length: ${content.length} characters`);
    console.log(`[SCRAPER][DEBUG] Content preview: ${content.substring(0, 100)}...`);
    
    if (!title || !content || content.length < 50) {
      console.log(`[SCRAPER][WARN] Invalid content for ${url}`);
      console.log(`[SCRAPER][WARN] Title: "${title}"`);
      console.log(`[SCRAPER][WARN] Content length: ${content.length}`);
      return;
    }

    // Clean content if needed
    const cleanedContent = config.cleanContent ? config.cleanContent(content) : content;
    
    // Store in database
    await prisma.answer.upsert({
      where: { sourceUrl: url },
      create: {
        question: title,
        answer: cleanedContent,
        firstAnswerParagraph: cleanedContent.split('\n')[0],
        sourceUrl: url,
        platform: config.name,
        category: 'help-center',
        tags: [],
      },
      update: {
        question: title,
        answer: cleanedContent,
        firstAnswerParagraph: cleanedContent.split('\n')[0],
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