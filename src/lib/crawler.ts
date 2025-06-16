import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { parse } from "url";

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
    questionSelector: "h1",
    answerSelector: "article p",
    categorySelector: ".breadcrumb li:last-child",
    platform: "Viator",
    category: "Help Center",
  },
  {
    baseUrl: "https://www.airbnb.com/help/",
    questionSelector: "h1",
    answerSelector: "article p",
    categorySelector: ".breadcrumb li:last-child",
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
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    
    // Set a reasonable timeout
    page.setDefaultTimeout(30000);
    
    // Add user agent to be more respectful
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (compatible; OTAAnswerHub/1.0; +https://otaanswerhub.com)'
    });

    await page.goto(url, { waitUntil: "networkidle" });

    // Extract question
    const question = await page.textContent(config.questionSelector);
    if (!question) {
      console.log(`[CRAWLER][WARN] No question found at ${url}`);
      return;
    }
    console.log(`[CRAWLER] Extracted question: ${question}`);

    // Extract full answer
    const answerElements = await page.$$(config.answerSelector);
    if (!answerElements.length) {
      console.log(`[CRAWLER][WARN] No answer elements found at ${url}`);
    }
    const answerText = await Promise.all(
      answerElements.map((el) => el.textContent())
    );
    const fullAnswer = answerText.join("\n\n");
    console.log(`[CRAWLER] Extracted answer length: ${fullAnswer.length}`);

    // Extract first paragraph
    const firstParagraph = await extractFirstParagraph(fullAnswer);

    // Extract category if available
    let category = config.category;
    if (config.categorySelector) {
      const categoryText = await page.textContent(config.categorySelector);
      if (categoryText) {
        category = categoryText.trim();
      }
    }

    // Extract tags if available
    let tags: string[] = [];
    if (config.tagSelector) {
      const tagElements = await page.$$(config.tagSelector);
      const tagTexts = await Promise.all(
        tagElements.map((el) => el.textContent())
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
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    
    // Set a reasonable timeout
    page.setDefaultTimeout(30000);
    
    // Add user agent to be more respectful
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (compatible; OTAAnswerHub/1.0; +https://otaanswerhub.com)'
    });

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