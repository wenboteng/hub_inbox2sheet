import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { MeiliSearch } from "meilisearch";

const prisma = new PrismaClient();
const meiliSearch = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
  apiKey: process.env.MEILISEARCH_API_KEY,
});

interface CrawlSource {
  name: string;
  url: string;
  type: "help_center" | "reddit" | "forum";
  selectors: {
    question: string;
    answer: string;
    category?: string;
    tags?: string;
  };
  delay?: number;
  extractTags?: (page: any, element: any) => Promise<string[]>;
}

const sources: CrawlSource[] = [
  {
    name: "Viator Partner Help",
    url: "https://www.viator.com/partner/help",
    type: "help_center",
    selectors: {
      question: "h1.article-title",
      answer: ".article-content p:first-of-type",
      category: ".breadcrumb-item:last-child",
      tags: ".article-tags .tag",
    },
    delay: 2000,
    extractTags: async (page, element) => {
      const tags = await element.$$eval(".article-tags .tag", (tags: any[]) =>
        tags.map((tag) => tag.textContent.trim())
      );
      return tags;
    },
  },
  {
    name: "Airbnb Host Help",
    url: "https://www.airbnb.com/help/hosting",
    type: "help_center",
    selectors: {
      question: "h1.article-title",
      answer: ".article-content .article-body p:first-of-type",
      category: ".breadcrumb-item:last-child",
      tags: ".article-tags .tag",
    },
    delay: 2000,
    extractTags: async (page, element) => {
      const tags = await element.$$eval(".article-tags .tag", (tags: any[]) =>
        tags.map((tag) => tag.textContent.trim())
      );
      return tags;
    },
  },
  {
    name: "Booking.com Partner Help",
    url: "https://partner.booking.com/en-us/help",
    type: "help_center",
    selectors: {
      question: "h1.article-title",
      answer: ".article-content .article-body p:first-of-type",
      category: ".breadcrumb-item:last-child",
      tags: ".article-tags .tag",
    },
    delay: 2000,
    extractTags: async (page, element) => {
      const tags = await element.$$eval(".article-tags .tag", (tags: any[]) =>
        tags.map((tag) => tag.textContent.trim())
      );
      return tags;
    },
  },
  {
    name: "GetYourGuide Supplier Support",
    url: "https://supplier.getyourguide.com/help/",
    type: "help_center",
    selectors: {
      question: "h1.article-title",
      answer: ".article-content .article-body p:first-of-type",
      category: ".breadcrumb-item:last-child",
      tags: ".article-tags .tag",
    },
    delay: 2000,
    extractTags: async (page, element) => {
      const tags = await element.$$eval(".article-tags .tag", (tags: any[]) =>
        tags.map((tag) => tag.textContent.trim())
      );
      return tags;
    },
  },
  {
    name: "Expedia Partner Central",
    url: "https://apps.expediapartnercentral.com/help/",
    type: "help_center",
    selectors: {
      question: "h1",
      answer: ".article-content",
      category: ".breadcrumb-item:last-child",
    },
    delay: 2000,
  },
  {
    name: "TripAdvisor Experiences",
    url: "https://www.tripadvisor.com/help/experiences",
    type: "help_center",
    selectors: {
      question: "h1",
      answer: ".article-content",
      category: ".breadcrumb-item:last-child",
    },
    delay: 2000,
  },
];

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function startCrawl() {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  for (const source of sources) {
    let crawlJob;
    try {
      // Create crawl job record
      crawlJob = await prisma.crawlJob.create({
        data: {
          source: source.name,
          status: "running",
          startedAt: new Date(),
        },
      });

      const page = await context.newPage();
      
      // Check robots.txt before crawling
      try {
        const robotsResponse = await fetch(`${new URL(source.url).origin}/robots.txt`);
        if (robotsResponse.ok) {
          const robotsText = await robotsResponse.text();
          if (robotsText.includes("Disallow: /help")) {
            console.log(`Skipping ${source.name} due to robots.txt restrictions`);
            continue;
          }
        }
      } catch (error) {
        console.warn(`Could not fetch robots.txt for ${source.name}:`, error);
      }

      await page.goto(source.url);

      // Extract questions and answers based on source type
      const answers = await extractAnswers(page, source);

      // Save to database
      for (const answer of answers) {
        await prisma.answer.create({
          data: {
            question: answer.question,
            answer: answer.answer,
            sourceUrl: answer.sourceUrl,
            platform: source.name,
            category: answer.category || "General",
            tags: answer.tags || [],
          },
        });

        // Add delay between requests if specified
        if (source.delay) {
          await delay(source.delay);
        }
      }

      // Update crawl job status
      await prisma.crawlJob.update({
        where: { id: crawlJob.id },
        data: {
          status: "completed",
          endedAt: new Date(),
        },
      });

      // Index in MeiliSearch
      await meiliSearch.index("answers").addDocuments(answers);
    } catch (error: any) {
      console.error(`Error crawling ${source.name}:`, error);
      
      // Update crawl job with error
      if (crawlJob) {
        await prisma.crawlJob.update({
          where: { id: crawlJob.id },
          data: {
            status: "failed",
            endedAt: new Date(),
            error: error.message,
          },
        });
      }
    }
  }

  await browser.close();
}

async function extractAnswers(page: any, source: CrawlSource) {
  const answers = [];

  switch (source.type) {
    case "help_center":
      // Extract from help center pages
      const articles = await page.$$("article");
      for (const article of articles) {
        try {
          const question = await article.$eval(
            source.selectors.question,
            (el: any) => el.textContent.trim()
          );
          const answer = await article.$eval(
            source.selectors.answer,
            (el: any) => {
              // Get first paragraph or first 200 characters
              const text = el.textContent.trim();
              const firstParagraph = text.split('\n')[0];
              return firstParagraph.length > 200 
                ? firstParagraph.substring(0, 200) + '...'
                : firstParagraph;
            }
          );
          const category = source.selectors.category
            ? await article.$eval(
                source.selectors.category,
                (el: any) => el.textContent.trim()
              )
            : "General";

          const sourceUrl = await article.$eval("a", (el: any) => el.href);

          // Extract tags if available
          let tags: string[] = [];
          if (source.extractTags) {
            try {
              tags = await source.extractTags(page, article);
            } catch (error) {
              console.warn("Error extracting tags:", error);
            }
          }

          answers.push({
            question,
            answer,
            category,
            sourceUrl,
            tags,
          });
        } catch (error) {
          console.warn("Error extracting article:", error);
          continue;
        }
      }
      break;

    case "reddit":
      // Add Reddit-specific extraction logic
      break;

    case "forum":
      // Add forum-specific extraction logic
      break;
  }

  return answers;
}

// Initialize MeiliSearch index
export async function initializeSearchIndex() {
  try {
    await meiliSearch.index("answers").updateSettings({
      searchableAttributes: ["question", "answer", "category", "tags"],
      filterableAttributes: ["platform", "category", "tags"],
      sortableAttributes: ["dateCollected"],
    });
  } catch (error) {
    console.error("Error initializing search index:", error);
  }
} 