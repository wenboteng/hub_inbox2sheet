import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from "@prisma/client";
import { parse } from "url";
import * as fs from 'fs';
import * as path from 'path';

// Add type declarations
declare module 'axios';
declare module 'cheerio';

const prisma = new PrismaClient();

// Create debug screenshots directory if it doesn't exist
const debugDir = path.join(process.cwd(), 'debug-screens');
if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir, { recursive: true });
}

interface CrawlConfig {
  baseUrl: string;
  questionSelector: string;
  answerSelector: string;
  categorySelector?: string;
  tagSelector?: string;
  platform: string;
  category: string;
  sitemapUrl?: string;
}

const CRAWL_CONFIGS: CrawlConfig[] = [
  {
    baseUrl: "https://www.viator.com/help/",
    questionSelector: ".article-title, .help-article-title, h1",
    answerSelector: ".article-content p, .help-article-content p, article p",
    categorySelector: ".breadcrumb li:last-child, .article-category",
    platform: "Viator",
    category: "Help Center",
    sitemapUrl: "https://www.viator.com/help/sitemap.xml"
  },
  {
    baseUrl: "https://www.airbnb.com/help/",
    questionSelector: "h1[data-testid='article-title'], ._1p0spma2, ._14i3z6h",
    answerSelector: "._5y5o50 p, ._1p0spma2 p, article p",
    categorySelector: "._1p0spma2, .breadcrumb li:last-child",
    platform: "Airbnb",
    category: "Help Center",
    sitemapUrl: "https://www.airbnb.com/help/sitemap.xml"
  },
  {
    baseUrl: "https://partner.booking.com/en-us/help/",
    questionSelector: "h1",
    answerSelector: "article p",
    categorySelector: ".breadcrumb li:last-child",
    platform: "Booking.com",
    category: "Partner Hub",
    sitemapUrl: "https://partner.booking.com/en-us/help/sitemap.xml"
  },
  {
    baseUrl: "https://supplier.getyourguide.com/help/",
    questionSelector: "h1",
    answerSelector: "article p",
    categorySelector: ".breadcrumb li:last-child",
    platform: "GetYourGuide",
    category: "Supplier Support",
    sitemapUrl: "https://supplier.getyourguide.com/help/sitemap.xml"
  },
  {
    baseUrl: "https://apps.expediapartnercentral.com/help/",
    questionSelector: "h1",
    answerSelector: "article p",
    categorySelector: ".breadcrumb li:last-child",
    platform: "Expedia",
    category: "Partner Central",
    sitemapUrl: "https://apps.expediapartnercentral.com/help/sitemap.xml"
  },
  {
    baseUrl: "https://www.tripadvisor.com/help/experiences",
    questionSelector: "h1",
    answerSelector: "article p",
    categorySelector: ".breadcrumb li:last-child",
    platform: "TripAdvisor",
    category: "Experiences",
    sitemapUrl: "https://www.tripadvisor.com/help/sitemap.xml"
  },
];

// Common browser headers to mimic real browser
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
  'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"'
};

// Helper function to add random delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to get random delay between 2-5 seconds
const getRandomDelay = () => Math.floor(Math.random() * 3000) + 2000;

async function extractFirstParagraph(text: string): Promise<string> {
  const paragraphs = text.split("\n").filter((p) => p.trim().length > 0);
  return paragraphs[0] || text;
}

async function extractUrlsFromSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    console.log(`[CRAWLER] Fetching sitemap: ${sitemapUrl}`);
    const response: AxiosResponse = await axios.get(sitemapUrl, {
      headers: BROWSER_HEADERS,
      timeout: 10000,
      validateStatus: (status) => status < 500 // Accept any status less than 500
    });

    if (response.status === 403) {
      console.error(`[CRAWLER] Access forbidden for sitemap: ${sitemapUrl}`);
      return [];
    }

    const $ = cheerio.load(response.data);
    const urls: string[] = [];
    
    const locElements = $('loc');
    locElements.each((_: number, element: any) => {
      const url = $(element).text();
      if (url) {
        urls.push(url);
      }
    });

    console.log(`[CRAWLER] Found ${urls.length} URLs in sitemap`);
    return urls;
  } catch (error) {
    console.error(`[CRAWLER] Error extracting URLs from sitemap ${sitemapUrl}:`, error);
    return [];
  }
}

async function crawlPage(url: string, config: CrawlConfig) {
  console.log(`[CRAWLER] Crawling URL: ${url} for platform: ${config.platform}`);
  
  try {
    // Add random delay between requests
    await delay(getRandomDelay());

    const response: AxiosResponse = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: 10000,
      validateStatus: (status) => status < 500
    });

    if (response.status === 403) {
      console.error(`[CRAWLER] Access forbidden for page: ${url}`);
      return;
    }

    const $ = cheerio.load(response.data);
    
    // Extract question
    let question = $(config.questionSelector).first().text().trim();
    if (!question) {
      console.log(`[CRAWLER][WARN] No question found at ${url}`);
      return;
    }
    console.log(`[CRAWLER] Extracted question: ${question}`);

    // Extract answer
    let answer = '';
    $(config.answerSelector).each((_: number, element: any) => {
      const text = $(element).text().trim();
      if (text) {
        answer += text + '\n';
      }
    });

    if (!answer) {
      console.log(`[CRAWLER][WARN] No answer found at ${url}`);
      return;
    }

    // Extract category if available
    let category = config.category;
    if (config.categorySelector) {
      const categoryText = $(config.categorySelector).first().text().trim();
      if (categoryText) {
        category = categoryText;
      }
    }

    // Extract first paragraph for summary
    const firstParagraph = await extractFirstParagraph(answer);

    // Store in database
    await prisma.answer.upsert({
      where: {
        sourceUrl: url
      },
      update: {
        question,
        answer,
        firstAnswerParagraph: firstParagraph,
        category,
        platform: config.platform,
        lastCrawled: new Date()
      },
      create: {
        question,
        answer,
        firstAnswerParagraph: firstParagraph,
        sourceUrl: url,
        category,
        platform: config.platform,
        lastCrawled: new Date()
      }
    });

    console.log(`[CRAWLER] Successfully processed: ${url}`);
    
  } catch (error) {
    console.error(`[CRAWLER] Error processing ${url}:`, error);
  }
}

async function crawlPlatform(config: CrawlConfig) {
  console.log(`[CRAWLER] Starting crawl for ${config.platform}`);
  
  let urls: string[] = [];
  
  // Try to get URLs from sitemap first
  if (config.sitemapUrl) {
    urls = await extractUrlsFromSitemap(config.sitemapUrl);
  }
  
  // If no URLs found from sitemap, use the base URL
  if (urls.length === 0) {
    urls = [config.baseUrl];
  }
  
  // Process each URL
  for (const url of urls) {
    await crawlPage(url, config);
  }
  
  console.log(`[CRAWLER] Finished crawling ${config.platform}`);
}

export async function startCrawl() {
  console.log('[CRAWLER] Starting crawl process...');
  
  try {
    for (const config of CRAWL_CONFIGS) {
      await crawlPlatform(config);
    }
    console.log('[CRAWLER] Crawl process completed successfully');
  } catch (error) {
    console.error('[CRAWLER] Error during crawl process:', error);
  } finally {
    await prisma.$disconnect();
  }
} 