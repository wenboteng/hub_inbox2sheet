import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { parse } from "url";
import { Page, ElementHandle } from "playwright";

const prisma = new PrismaClient();

interface CrawlConfig {
  baseUrl: string;
  questionSelector: string;
  answerSelector: string;
  categorySelector?: string;
  tagSelector?: string;
  platform: string;
  category: string;
}

const CRAWL_CONFIGS: CrawlConfig[] = [
  {
    baseUrl: "https://www.viator.com/help/",
    questionSelector: ".article-title, .help-article-title, h1",
    answerSelector: ".article-content p, .help-article-content p, article p",
    categorySelector: ".breadcrumb li:last-child, .article-category",
    platform: "Viator",
    category: "Help Center",
  },
  {
    baseUrl: "https://www.airbnb.com/help/",
    questionSelector: "h1[data-testid='article-title'], ._1p0spma2, ._14i3z6h",
    answerSelector: "._5y5o50 p, ._1p0spma2 p, article p",
    categorySelector: "._1p0spma2, .breadcrumb li:last-child",
    platform: "Airbnb",
    category: "Help Center",
  },
  {
    baseUrl: "https://partner.booking.com/en-us/help/",
    questionSelector: "h1",
    answerSelector: "article p",
    categorySelector: ".breadcrumb li:last-child",
    platform: "Booking.com",
    category: "Partner Hub",
  },
  {
    baseUrl: "https://supplier.getyourguide.com/help/",
    questionSelector: "h1",
    answerSelector: "article p",
    categorySelector: ".breadcrumb li:last-child",
    platform: "GetYourGuide",
    category: "Supplier Support",
  },
  {
    baseUrl: "https://apps.expediapartnercentral.com/help/",
    questionSelector: "h1",
    answerSelector: "article p",
    categorySelector: ".breadcrumb li:last-child",
    platform: "Expedia",
    category: "Partner Central",
  },
  {
    baseUrl: "https://www.tripadvisor.com/help/experiences",
    questionSelector: "h1",
    answerSelector: "article p",
    categorySelector: ".breadcrumb li:last-child",
    platform: "TripAdvisor",
    category: "Experiences",
  },
];

async function extractFirstParagraph(text: string): Promise<string> {
  const paragraphs = text.split("\n").filter((p) => p.trim().length > 0);
  return paragraphs[0] || text;
}

// Add delay between requests to be respectful to servers
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function crawlPage(url: string, config: CrawlConfig) {
  console.log(`[CRAWLER] Crawling URL: ${url} for platform: ${config.platform}`);
  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation'],
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      }
    });

    const page = await context.newPage();
    
    // Set a longer timeout
    page.setDefaultTimeout(45000);
    
    // Enable request interception to block unnecessary resources
    await page.route('**/*.{png,jpg,jpeg,gif,svg,css,font,woff,woff2,eot,ttf,otf}', route => route.abort());
    
    // Wait for either DOMContentLoaded or load event with retry
    let retries = 3;
    while (retries > 0) {
      try {
        // First try to load the page
        await page.goto(url, { 
          waitUntil: "networkidle",
          timeout: 45000 
        });

        // Wait for any potential redirects to complete
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        
        // Check if we're on the correct page
        const currentUrl = page.url();
        if (currentUrl !== url && !currentUrl.includes('login')) {
          console.log(`[CRAWLER] Page redirected to: ${currentUrl}`);
          url = currentUrl;
        }

        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        console.log(`[CRAWLER] Retrying page load for ${url}, ${retries} attempts remaining`);
        await delay(5000); // Wait 5 seconds before retry
      }
    }

    // Wait for content to be visible with retry
    let contentVisible = false;
    for (const selector of config.questionSelector.split(', ')) {
      try {
        await page.waitForSelector(selector, { timeout: 20000, state: 'visible' });
        contentVisible = true;
        break;
      } catch (error) {
        console.log(`[CRAWLER][WARN] Selector timeout: ${selector}`);
      }
    }

    if (!contentVisible) {
      console.log(`[CRAWLER][WARN] No content visible at ${url}`);
      return;
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: `/tmp/crawler-${Date.now()}.png` }).catch(() => {});

    // Extract question with retry
    let question = null;
    for (const selector of config.questionSelector.split(', ')) {
      question = await page.textContent(selector).catch(() => null);
      if (question) break;
    }

    if (!question) {
      console.log(`[CRAWLER][WARN] No question found at ${url}`);
      return;
    }
    console.log(`[CRAWLER] Extracted question: ${question}`);

    // Extract answer with retry
    const answerSelectors = config.answerSelector.split(', ');
    let answerElements: ElementHandle[] = [];
    for (const selector of answerSelectors) {
      const elements = await page.$$(selector).catch(() => [] as ElementHandle[]);
      if (elements.length > 0) {
        answerElements = elements;
        break;
      }
    }

    if (!answerElements.length) {
      console.log(`[CRAWLER][WARN] No answer elements found at ${url}`);
    }

    const answerText = await Promise.all(
      answerElements.map((el) => el.textContent().catch(() => ''))
    );
    const fullAnswer = answerText.filter(text => text).join("\n\n");
    console.log(`[CRAWLER] Extracted answer length: ${fullAnswer.length}`);

    // Extract first paragraph
    const firstParagraph = await extractFirstParagraph(fullAnswer);

    // Extract category if available
    let category = config.category;
    if (config.categorySelector) {
      const categoryText = await page.textContent(config.categorySelector).catch(() => null);
      if (categoryText) {
        category = categoryText.trim();
      }
    }

    // Extract tags if available
    let tags: string[] = [];
    if (config.tagSelector) {
      const tagElements = await page.$$(config.tagSelector).catch(() => []);
      const tagTexts = await Promise.all(
        tagElements.map((el) => el.textContent().catch(() => null))
      );
      tags = tagTexts.filter((text): text is string => text !== null);
    }

    // Check for existing answer
    const existingAnswer = await prisma.answer.findFirst({
      where: {
        question: question,
        platform: config.platform,
      },
    });

    if (existingAnswer) {
      console.log(`[CRAWLER] Updating existing answer for question: ${question}`);
      await prisma.answer.update({
        where: { id: existingAnswer.id },
        data: {
          answer: fullAnswer,
          firstAnswerParagraph: firstParagraph,
          category,
          tags,
          lastCrawled: new Date(),
        },
      });
    } else {
      console.log(`[CRAWLER] Creating new answer for question: ${question}`);
      await prisma.answer.create({
        data: {
          question,
          answer: fullAnswer,
          firstAnswerParagraph: firstParagraph,
          sourceUrl: url,
          platform: config.platform,
          category,
          tags,
        },
      });
    }

    // Add delay between requests
    await delay(2000);
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
  } finally {
    await browser.close();
  }
}

async function crawlPlatform(config: CrawlConfig) {
  console.log(`[CRAWLER] Starting crawl for platform: ${config.platform}`);
  const browser = await chromium.launch({
    chromiumSandbox: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; OTAAnswerHub/1.0; +https://otaanswerhub.com)',
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true
    });
    
    const page = await context.newPage();
    
    // Set a reasonable timeout
    page.setDefaultTimeout(30000);

    await page.goto(config.baseUrl, { waitUntil: "networkidle" });

    // Find all article links
    const links = await page.$$("a[href*='/help/']");
    const urls = await Promise.all(
      links.map((link) => link.getAttribute("href"))
    );

    // Filter and normalize URLs
    const validUrls = urls
      .filter((url): url is string => !!url)
      .map((url) => {
        if (url.startsWith("/")) {
          return new URL(url, config.baseUrl).toString();
        }
        return url;
      });

    console.log(`[CRAWLER] Found ${validUrls.length} article URLs for platform: ${config.platform}`);

    // Crawl each article
    for (const url of validUrls) {
      await crawlPage(url, config);
      // Add delay between pages
      await delay(2000);
    }
  } catch (error) {
    console.error(`Error crawling platform ${config.platform}:`, error);
  } finally {
    await browser.close();
  }
}

export async function startCrawl() {
  console.log("Starting crawl...");
  
  // Create crawl job
  const job = await prisma.crawlJob.create({
    data: {
      source: "all",
      status: "running",
      startedAt: new Date(),
    },
  });

  try {
    // Crawl each platform
    for (const config of CRAWL_CONFIGS) {
      console.log(`Crawling ${config.platform}...`);
      await crawlPlatform(config);
      // Add delay between platforms
      await delay(5000);
    }

    // Update job status
    await prisma.crawlJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        endedAt: new Date(),
      },
    });

    console.log("Crawl completed successfully");
  } catch (error) {
    console.error("Crawl failed:", error);
    
    // Update job status
    await prisma.crawlJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        endedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
} 