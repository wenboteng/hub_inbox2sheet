import { PrismaClient } from '@prisma/client';
import type { Page } from 'puppeteer';
import { getContentEmbeddings } from '@/utils/openai';
import { scrapeAirbnb } from '../scripts/scrapers/airbnb';
import { crawlGetYourGuideArticles, crawlGetYourGuideArticlesWithPagination } from '@/crawlers/getyourguide';
import { crawlViatorArticles } from '@/crawlers/viator';
import {
  generateContentHash,
  checkContentDuplicate,
} from '@/utils/contentDeduplication';
import { isFeatureEnabled } from '@/utils/featureFlags';
import { detectLanguage } from '@/utils/languageDetection';
import { slugify } from '@/utils/slugify';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

interface Article {
  url: string;
  question: string;
  answer: string;
  platform: string;
  category: string;
  contentType: 'official' | 'community';
}

// Helper function to setup a page
async function setupPage(page: Page) {
  await page.setViewport({
    width: 1280,
    height: 800
  });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.setDefaultTimeout(120000);
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });
  page.on('dialog', async (dialog) => {
    console.log(`[PUPPETEER] Dismissing dialog: ${dialog.message()}`);
    await dialog.dismiss();
  });
}

// Function to get existing article URLs from database
async function getExistingArticleUrls(): Promise<Set<string>> {
  const existingArticles = await prisma.article.findMany({
    select: { url: true },
  });
  return new Set(existingArticles.map((a: { url: string }) => a.url));
}

// Deep scraping of Airbnb with pagination and new article discovery
async function deepScrapeAirbnb(): Promise<Article[]> {
  console.log('[DEEP-SCRAPE] Starting deep Airbnb scraping...');
  const articles: Article[] = [];
  
  try {
    const { createBrowser } = await import('@/utils/puppeteer');
    const browser = await createBrowser();
    
    try {
      const page = await browser.newPage();
      await setupPage(page);
      
      // Extended list of Airbnb help pages with pagination
      const helpPages = [
        'https://www.airbnb.com/help',
        'https://www.airbnb.com/help/article/2855',
        'https://www.airbnb.com/help/article/2856',
        'https://www.airbnb.com/help/article/2857',
        'https://www.airbnb.com/help/article/2858',
        'https://www.airbnb.com/help/article/2859',
        'https://www.airbnb.com/help/article/2860',
        'https://www.airbnb.com/help/article/2861',
        'https://www.airbnb.com/help/article/2862',
        'https://www.airbnb.com/help/article/2863',
        'https://www.airbnb.com/help/article/2864',
        'https://www.airbnb.com/help/article/2865',
        'https://www.airbnb.com/help/article/2866',
        'https://www.airbnb.com/help/article/2867',
        'https://www.airbnb.com/help/article/2868',
        'https://www.airbnb.com/help/article/2869',
        'https://www.airbnb.com/help/article/2870',
        'https://www.airbnb.com/help/article/2871',
        'https://www.airbnb.com/help/article/2872',
        'https://www.airbnb.com/help/article/2873',
        'https://www.airbnb.com/help/article/2874',
        'https://www.airbnb.com/help/article/2875',
        'https://www.airbnb.com/help/article/2876',
        'https://www.airbnb.com/help/article/2877',
        'https://www.airbnb.com/help/article/2878',
        'https://www.airbnb.com/help/article/2879',
        'https://www.airbnb.com/help/article/2880',
        'https://www.airbnb.com/help/article/2881',
        'https://www.airbnb.com/help/article/2882',
        'https://www.airbnb.com/help/article/2883',
        'https://www.airbnb.com/help/article/2884',
        'https://www.airbnb.com/help/article/2885',
        'https://www.airbnb.com/help/article/2886',
        'https://www.airbnb.com/help/article/2887',
        'https://www.airbnb.com/help/article/2888',
        'https://www.airbnb.com/help/article/2889',
        'https://www.airbnb.com/help/article/2890',
        'https://www.airbnb.com/help/article/2891',
        'https://www.airbnb.com/help/article/2892',
        'https://www.airbnb.com/help/article/2893',
        'https://www.airbnb.com/help/article/2894',
        'https://www.airbnb.com/help/article/2895',
        'https://www.airbnb.com/help/article/2896',
        'https://www.airbnb.com/help/article/2897',
        'https://www.airbnb.com/help/article/2898',
        'https://www.airbnb.com/help/article/2899',
        'https://www.airbnb.com/help/article/2900',
      ];
      
      for (const helpPage of helpPages) {
        try {
          console.log(`[DEEP-SCRAPE] Scraping ${helpPage}...`);
          await page.goto(helpPage, { waitUntil: 'domcontentloaded', timeout: 30000 });
          
          // Extract all article links
          const articleLinks = await page.$$eval('a[href*="/help/article/"]', (links) =>
            links.map((link: Element) => (link as HTMLAnchorElement).href)
          );
          
          console.log(`[DEEP-SCRAPE] Found ${articleLinks.length} article links on ${helpPage}`);
          
          // Scrape each article
          for (const articleUrl of articleLinks.slice(0, 15)) { // Increased limit
            try {
              await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
              
              const articleData = await page.evaluate(() => {
                const title = document.querySelector('h1, .title, .article-title')?.textContent?.trim() || '';
                const content = document.querySelector('.article-content, .content, .body')?.textContent?.trim() || '';
                return { title, content };
              });
              
              if (articleData.title && articleData.content && articleData.content.length > 100) {
                articles.push({
                  url: articleUrl,
                  question: articleData.title,
                  answer: articleData.content,
                  platform: 'Airbnb',
                  category: 'Help Center',
                  contentType: 'official'
                });
                console.log(`[DEEP-SCRAPE] Scraped: ${articleData.title}`);
              }
              
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
              console.error(`[DEEP-SCRAPE] Error scraping article ${articleUrl}:`, error);
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`[DEEP-SCRAPE] Error scraping help page ${helpPage}:`, error);
        }
      }
      
      await page.close();
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('[DEEP-SCRAPE] Failed to create browser:', error);
  }
  
  console.log(`[DEEP-SCRAPE] Deep Airbnb scraping completed. Found ${articles.length} articles`);
  return articles;
}

// Scrape TripAdvisor help center
async function scrapeTripAdvisor(): Promise<Article[]> {
  console.log('[NEW-SOURCES] Starting TripAdvisor scraping...');
  const articles: Article[] = [];
  
  try {
    const { createBrowser } = await import('@/utils/puppeteer');
    const browser = await createBrowser();
    
    try {
      const page = await browser.newPage();
      await setupPage(page);
      
      // Updated TripAdvisor help center URLs with correct structure
      const helpUrls = [
        'https://www.tripadvisor.com/help',
        'https://www.tripadvisor.com/help/booking',
        'https://www.tripadvisor.com/help/payment',
        'https://www.tripadvisor.com/help/cancellation',
        'https://www.tripadvisor.com/help/refund',
        'https://www.tripadvisor.com/help/contact',
        'https://www.tripadvisor.com/help/account',
        'https://www.tripadvisor.com/help/technical',
        'https://www.tripadvisor.com/help/security',
        'https://www.tripadvisor.com/help/privacy',
        // Try alternative help URLs
        'https://www.tripadvisor.com/help/faq',
        'https://www.tripadvisor.com/help/support',
        'https://www.tripadvisor.com/help/contact-us',
        'https://www.tripadvisor.com/help/terms',
        'https://www.tripadvisor.com/help/privacy-policy',
      ];
      
      for (const helpUrl of helpUrls) {
        try {
          console.log(`[NEW-SOURCES] Scraping ${helpUrl}...`);
          await page.goto(helpUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          
          // Wait a bit for content to load
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Debug: Check what's on the page
          const pageTitle = await page.title();
          console.log(`[NEW-SOURCES] Page title: ${pageTitle}`);
          
          const articleData = await page.evaluate(() => {
            // Try multiple selectors for TripAdvisor
            const titleSelectors = [
              'h1', '.title', '.page-title', '.help-title', 
              '.article-title', '.content-title', '.main-title'
            ];
            const contentSelectors = [
              '.content', '.body', '.help-content', '.help-text', 
              '.article-content', '.main-content', '.page-content',
              '.faq-content', '.support-content'
            ];
            
            let title = '';
            let content = '';
            
            // Try to find title
            for (const selector of titleSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent?.trim()) {
                title = element.textContent.trim();
                break;
              }
            }
            
            // Try to find content
            for (const selector of contentSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent?.trim()) {
                content = element.textContent.trim();
                break;
              }
            }
            
            // If no specific content found, try to get all text content
            if (!content) {
              const body = document.querySelector('body');
              if (body) {
                content = body.textContent?.trim() || '';
              }
            }
            
            return { title, content };
          });
          
          console.log(`[NEW-SOURCES] Found title: "${articleData.title}" (${articleData.title.length} chars)`);
          console.log(`[NEW-SOURCES] Found content: ${articleData.content.length} chars`);
          
          if (articleData.title && articleData.content && articleData.content.length > 100) {
            articles.push({
              url: helpUrl,
              question: articleData.title,
              answer: articleData.content,
              platform: 'TripAdvisor',
              category: 'Help Center',
              contentType: 'official'
            });
            console.log(`[NEW-SOURCES] Scraped TripAdvisor: ${articleData.title}`);
          } else {
            console.log(`[NEW-SOURCES] No valid content found on ${helpUrl}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`[NEW-SOURCES] Error scraping TripAdvisor ${helpUrl}:`, error);
        }
      }
      
      await page.close();
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('[NEW-SOURCES] Failed to create browser for TripAdvisor:', error);
  }
  
  console.log(`[NEW-SOURCES] TripAdvisor scraping completed. Found ${articles.length} articles`);
  return articles;
}

// Scrape Booking.com help center
async function scrapeBooking(): Promise<Article[]> {
  console.log('[NEW-SOURCES] Starting Booking.com scraping...');
  const articles: Article[] = [];
  
  try {
    const { createBrowser } = await import('@/utils/puppeteer');
    const browser = await createBrowser();
    
    try {
      const page = await browser.newPage();
      await setupPage(page);
      
      // Updated Booking.com help center URLs with correct structure
      const helpUrls = [
        'https://www.booking.com/content/help.html',
        'https://www.booking.com/content/help/booking.html',
        'https://www.booking.com/content/help/payment.html',
        'https://www.booking.com/content/help/cancellation.html',
        'https://www.booking.com/content/help/refund.html',
        'https://www.booking.com/content/help/contact.html',
        'https://www.booking.com/content/help/account.html',
        'https://www.booking.com/content/help/technical.html',
        'https://www.booking.com/content/help/security.html',
        'https://www.booking.com/content/help/privacy.html',
        // Try alternative help URLs
        'https://www.booking.com/content/help/faq.html',
        'https://www.booking.com/content/help/support.html',
        'https://www.booking.com/content/help/contact-us.html',
        'https://www.booking.com/content/help/terms.html',
        'https://www.booking.com/content/help/privacy-policy.html',
        // Try customer service URLs
        'https://www.booking.com/content/customer-service.html',
        'https://www.booking.com/content/help-center.html',
      ];
      
      for (const helpUrl of helpUrls) {
        try {
          console.log(`[NEW-SOURCES] Scraping ${helpUrl}...`);
          await page.goto(helpUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          
          // Wait a bit for content to load
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Debug: Check what's on the page
          const pageTitle = await page.title();
          console.log(`[NEW-SOURCES] Page title: ${pageTitle}`);
          
          const articleData = await page.evaluate(() => {
            // Try multiple selectors for Booking.com
            const titleSelectors = [
              'h1', '.title', '.page-title', '.help-title', 
              '.article-title', '.content-title', '.main-title',
              '.header-title', '.page-header h1'
            ];
            const contentSelectors = [
              '.content', '.body', '.help-content', '.help-text', 
              '.article-content', '.main-content', '.page-content',
              '.faq-content', '.support-content', '.help-body'
            ];
            
            let title = '';
            let content = '';
            
            // Try to find title
            for (const selector of titleSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent?.trim()) {
                title = element.textContent.trim();
                break;
              }
            }
            
            // Try to find content
            for (const selector of contentSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent?.trim()) {
                content = element.textContent.trim();
                break;
              }
            }
            
            // If no specific content found, try to get all text content
            if (!content) {
              const body = document.querySelector('body');
              if (body) {
                content = body.textContent?.trim() || '';
              }
            }
            
            return { title, content };
          });
          
          console.log(`[NEW-SOURCES] Found title: "${articleData.title}" (${articleData.title.length} chars)`);
          console.log(`[NEW-SOURCES] Found content: ${articleData.content.length} chars`);
          
          if (articleData.title && articleData.content && articleData.content.length > 100) {
            articles.push({
              url: helpUrl,
              question: articleData.title,
              answer: articleData.content,
              platform: 'Booking.com',
              category: 'Help Center',
              contentType: 'official'
            });
            console.log(`[NEW-SOURCES] Scraped Booking.com: ${articleData.title}`);
          } else {
            console.log(`[NEW-SOURCES] No valid content found on ${helpUrl}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`[NEW-SOURCES] Error scraping Booking.com ${helpUrl}:`, error);
        }
      }
      
      await page.close();
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('[NEW-SOURCES] Failed to create browser for Booking.com:', error);
  }
  
  console.log(`[NEW-SOURCES] Booking.com scraping completed. Found ${articles.length} articles`);
  return articles;
}

// Scrape Reddit travel communities
async function scrapeReddit(): Promise<Article[]> {
  console.log('[NEW-SOURCES] Starting Reddit scraping...');
  const articles: Article[] = [];
  
  try {
    const { createBrowser } = await import('@/utils/puppeteer');
    const browser = await createBrowser();
    
    try {
      const page = await browser.newPage();
      await setupPage(page);
      
      // Reddit travel communities
      const redditUrls = [
        'https://www.reddit.com/r/travel/',
        'https://www.reddit.com/r/backpacking/',
        'https://www.reddit.com/r/solotravel/',
        'https://www.reddit.com/r/digitalnomad/',
        'https://www.reddit.com/r/travelpartners/',
        'https://www.reddit.com/r/travelhacks/',
        'https://www.reddit.com/r/budgettravel/',
        'https://www.reddit.com/r/airbnb/',
      ];
      
      for (const redditUrl of redditUrls) {
        try {
          console.log(`[NEW-SOURCES] Scraping ${redditUrl}...`);
          await page.goto(redditUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          
          // Extract top posts
          const posts = await page.$$eval('h3, .title, [data-testid="post-title"]', (elements) =>
            elements.slice(0, 15).map((el) => ({
              title: el.textContent?.trim() || '',
              url: el.closest('a')?.href || ''
            }))
          );
          
          for (const post of posts) {
            if (post.title && post.url && post.title.length > 10) {
              try {
                await page.goto(post.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                
                const postContent = await page.evaluate(() => {
                  const content = document.querySelector('.content, .body, [data-testid="post-content"]')?.textContent?.trim() || '';
                  return content;
                });
                
                if (postContent && postContent.length > 100) {
                  articles.push({
                    url: post.url,
                    question: post.title,
                    answer: postContent,
                    platform: 'Reddit',
                    category: 'Travel Community',
                    contentType: 'community'
                  });
                  console.log(`[NEW-SOURCES] Scraped Reddit: ${post.title}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
              } catch (error) {
                console.error(`[NEW-SOURCES] Error scraping Reddit post ${post.url}:`, error);
              }
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
          console.error(`[NEW-SOURCES] Error scraping Reddit ${redditUrl}:`, error);
        }
      }
      
      await page.close();
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('[NEW-SOURCES] Failed to create browser for Reddit:', error);
  }
  
  console.log(`[NEW-SOURCES] Reddit scraping completed. Found ${articles.length} articles`);
  return articles;
}

// Scrape Quora travel topics
async function scrapeQuora(): Promise<Article[]> {
  console.log('[NEW-SOURCES] Starting Quora scraping...');
  const articles: Article[] = [];
  
  try {
    const { createBrowser } = await import('@/utils/puppeteer');
    const browser = await createBrowser();
    
    try {
      const page = await browser.newPage();
      await setupPage(page);
      
      // Quora travel topics - using more reliable URLs
      const quoraUrls = [
        'https://www.quora.com/topic/Travel',
        'https://www.quora.com/topic/Vacation-Rentals',
        'https://www.quora.com/topic/Backpacking',
        'https://www.quora.com/topic/Solo-Travel',
        'https://www.quora.com/topic/Budget-Travel',
        'https://www.quora.com/topic/Airbnb',
        'https://www.quora.com/topic/Travel-Tips',
        'https://www.quora.com/topic/Travel-Planning',
      ];
      
      for (const quoraUrl of quoraUrls) {
        try {
          console.log(`[NEW-SOURCES] Scraping ${quoraUrl}...`);
          await page.goto(quoraUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
          
          // Wait longer for Quora to load
          await new Promise(resolve => setTimeout(resolve, 8000));
          
          // Debug: Check page title
          const pageTitle = await page.title();
          console.log(`[NEW-SOURCES] Quora page title: ${pageTitle}`);
          
          // Extract questions with better selectors
          const questions = await page.evaluate(() => {
            // Try multiple selectors for Quora questions
            const questionSelectors = [
              'a[href*="/question/"]',
              '.question_link',
              '.question-title',
              '[data-testid="question-title"]',
              '.q-text',
              '.question_text',
              'h3 a[href*="/question/"]',
              '.title a[href*="/question/"]'
            ];
            
            const questions: Array<{title: string, url: string}> = [];
            
            for (const selector of questionSelectors) {
              const elements = document.querySelectorAll(selector);
              elements.forEach((element) => {
                const link = element as HTMLAnchorElement;
                const title = link.textContent?.trim() || '';
                const url = link.href || '';
                
                if (title.length > 10 && url.includes('/question/') && !questions.some(q => q.url === url)) {
                  questions.push({ title, url });
                }
              });
              
              if (questions.length > 0) break; // Use first selector that works
            }
            
            return questions.slice(0, 10);
          });
          
          console.log(`[NEW-SOURCES] Found ${questions.length} questions on ${quoraUrl}`);
          
          for (const question of questions.slice(0, 3)) { // Limit to 3 questions per topic
            if (question.title && question.url && question.title.length > 10) {
              try {
                console.log(`[NEW-SOURCES] Scraping question: ${question.title}`);
                await page.goto(question.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
                
                // Wait for content to load
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                const answerContent = await page.evaluate(() => {
                  // Try multiple selectors for Quora answers
                  const answerSelectors = [
                    '.q-text',
                    '.Answer',
                    '.answer_text',
                    '.rendered_qtext',
                    '.content',
                    '.answer',
                    '[data-testid="answer-content"]',
                    '.answer-content',
                    '.answer-body'
                  ];
                  
                  for (const selector of answerSelectors) {
                    const elements = document.querySelectorAll(selector);
                    for (let i = 0; i < elements.length; i++) {
                      const element = elements[i];
                      const content = element.textContent?.trim();
                      if (content && content.length > 100) {
                        return content;
                      }
                    }
                  }
                  
                  // Fallback: try to get any text content
                  const body = document.querySelector('body');
                  if (body) {
                    return body.textContent?.trim() || '';
                  }
                  
                  return '';
                });
                
                if (answerContent && answerContent.length > 100) {
                  articles.push({
                    url: question.url,
                    question: question.title,
                    answer: answerContent,
                    platform: 'Quora',
                    category: 'Travel Q&A',
                    contentType: 'community'
                  });
                  console.log(`[NEW-SOURCES] Scraped Quora: ${question.title}`);
                } else {
                  console.log(`[NEW-SOURCES] No valid answer content found for: ${question.title}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 3000));
              } catch (error) {
                console.error(`[NEW-SOURCES] Error scraping Quora question ${question.url}:`, error);
              }
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
          console.error(`[NEW-SOURCES] Error scraping Quora ${quoraUrl}:`, error);
        }
      }
      
      await page.close();
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('[NEW-SOURCES] Failed to create browser for Quora:', error);
  }
  
  console.log(`[NEW-SOURCES] Quora scraping completed. Found ${articles.length} articles`);
  return articles;
}

// Generates a unique slug, handling potential collisions.
async function generateUniqueSlug(title: string): Promise<string> {
  let slug = slugify(title);
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 5) {
    const existingSlug = await prisma.article.findUnique({ where: { slug } });
    if (existingSlug) {
      console.log(`[SLUG] Slug conflict detected for "${slug}". Generating a new one.`);
      const randomSuffix = randomBytes(3).toString('hex');
      slug = `${slugify(title)}-${randomSuffix}`;
      attempts++;
    } else {
      isUnique = true;
    }
  }
  if (!isUnique) {
    const finalSuffix = randomBytes(6).toString('hex');
    slug = `article-${finalSuffix}`;
    console.log(`[SLUG] Could not generate a unique slug for title "${title}". Using fallback: ${slug}`);
  }
  return slug;
}

async function main() {
  try {
    console.log('[COMPREHENSIVE-DISCOVERY] Starting comprehensive discovery process...');
    await prisma.$connect();
    console.log('[COMPREHENSIVE-DISCOVERY] Database connection successful');
    
    const existingUrls = await getExistingArticleUrls();
    console.log(`[COMPREHENSIVE-DISCOVERY] Found ${existingUrls.size} existing articles in database`);
    
    let allArticles: Article[] = [];
    
    // Deep scraping of existing platforms
    console.log('\n[COMPREHENSIVE-DISCOVERY] === DEEP CONTENT DISCOVERY ===');
    try {
      const deepAirbnbArticles = await deepScrapeAirbnb();
      allArticles = allArticles.concat(deepAirbnbArticles);
    } catch (e) {
      console.error('[COMPREHENSIVE-DISCOVERY] Deep Airbnb scraping failed:', e);
    }
    
    // Regular scrapers with enhanced pagination
    const existingScrapers = [
      { name: 'Airbnb', scraper: scrapeAirbnb, enabled: true },
      { name: 'GetYourGuide', scraper: crawlGetYourGuideArticlesWithPagination, enabled: isFeatureEnabled('enableGetYourGuidePagination') },
      { name: 'Viator', scraper: crawlViatorArticles, enabled: isFeatureEnabled('enableViatorScraping') },
    ];

    for (const scraper of existingScrapers) {
      if (scraper.enabled) {
        console.log(`\n[COMPREHENSIVE-DISCOVERY] Starting ${scraper.name} scraping...`);
        try {
          const articles = await scraper.scraper();
          const mappedArticles = articles.map((a: any) => ({
            ...a,
            platform: scraper.name,
            contentType: 'official',
            category: a.category || 'Help Center',
          }));
          allArticles = allArticles.concat(mappedArticles);
        } catch (e) {
          console.error(`[COMPREHENSIVE-DISCOVERY] ${scraper.name} scraping failed:`, e);
        }
      }
    }
    
    // New content sources
    console.log('\n[COMPREHENSIVE-DISCOVERY] === NEW CONTENT SOURCES ===');
    const newSources = [
      { name: 'TripAdvisor', scraper: scrapeTripAdvisor, enabled: true },
      { name: 'Booking.com', scraper: scrapeBooking, enabled: true },
      { name: 'Reddit', scraper: scrapeReddit, enabled: true },
      { name: 'Quora', scraper: scrapeQuora, enabled: true },
    ];

    for (const source of newSources) {
      if (source.enabled) {
        console.log(`\n[COMPREHENSIVE-DISCOVERY] Starting ${source.name} scraping...`);
        try {
          const articles = await source.scraper();
          allArticles = allArticles.concat(articles);
        } catch (e) {
          console.error(`[COMPREHENSIVE-DISCOVERY] ${source.name} scraping failed:`, e);
        }
      }
    }

    console.log(`\n[COMPREHENSIVE-DISCOVERY] Found a total of ${allArticles.length} articles from all sources.`);

    const newArticles = allArticles.filter(article => !existingUrls.has(article.url));
    console.log(`[COMPREHENSIVE-DISCOVERY] ${newArticles.length} are new articles not yet in the database.`);

    let processedCount = 0, errorCount = 0;
    
    for (const article of newArticles) {
      try {
        const contentHash = generateContentHash(article.answer);
        let isDuplicate = false;
        if (contentHash) {
          const duplicateCheck = await checkContentDuplicate(contentHash);
          if (duplicateCheck.isDuplicate) {
            console.log(`[COMPREHENSIVE-DISCOVERY][DEDUP] Found content duplicate of ${duplicateCheck.existingArticle?.url}.`);
            isDuplicate = true;
          }
        }
        
        const languageDetection = detectLanguage(article.answer);
        const slug = await generateUniqueSlug(article.question);
        
        let paragraphsWithEmbeddings: any[] = [];
        try {
          paragraphsWithEmbeddings = await getContentEmbeddings(article.answer);
        } catch (embeddingError) {
          console.error('[COMPREHENSIVE-DISCOVERY] Failed to generate embeddings:', embeddingError);
        }

        const created = await prisma.article.create({
          data: {
            url: article.url,
            question: article.question,
            slug: slug,
            answer: article.answer,
            category: article.category,
            platform: article.platform,
            contentType: article.contentType,
            source: 'help_center',
            contentHash: contentHash || null,
            isDuplicate: isDuplicate,
            language: languageDetection.language,
          },
        });

        if (paragraphsWithEmbeddings.length > 0) {
          await prisma.articleParagraph.createMany({
            data: paragraphsWithEmbeddings.map(p => ({
              articleId: created.id,
              text: p.text,
              embedding: p.embedding,
            })),
          });
        }
        processedCount++;
        console.log(`[COMPREHENSIVE-DISCOVERY] Successfully processed article: ${article.question}`);
      } catch (articleError: any) {
        console.error(`[COMPREHENSIVE-DISCOVERY] Error processing article "${article.question}" (${article.url}):`);
        console.error(articleError.message);
        errorCount++;
      }
    }

    console.log(`\n[COMPREHENSIVE-DISCOVERY] Processing summary:`);
    console.log(`[COMPREHENSIVE-DISCOVERY] - New articles processed: ${processedCount}`);
    console.log(`[COMPREHENSIVE-DISCOVERY] - Articles with errors: ${errorCount}`);
    console.log(`[COMPREHENSIVE-DISCOVERY] - Total new articles attempted: ${newArticles.length}`);

    console.log('\n[COMPREHENSIVE-DISCOVERY] Comprehensive discovery process completed successfully');
  } catch (error) {
    console.error('[COMPREHENSIVE-DISCOVERY] Error during comprehensive discovery:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('[COMPREHENSIVE-DISCOVERY] Database connection closed');
  }
}

main(); 

// Export functions for use in other scripts
export {
  deepScrapeAirbnb,
  scrapeTripAdvisor,
  scrapeBooking,
  scrapeReddit,
  scrapeQuora
};