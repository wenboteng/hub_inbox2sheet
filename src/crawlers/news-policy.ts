import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { detectLanguage } from '../utils/languageDetection';
import { slugify } from '../utils/slugify';
import { getEmbedding } from '../utils/openai';

const prisma = new PrismaClient();

interface NewsArticle {
  url: string;
  title: string;
  content: string;
  platform: string;
  category: string;
  publishDate?: string;
  author?: string;
  summary?: string;
  tags?: string[];
  contentType: 'news' | 'policy' | 'announcement';
  priority: 'high' | 'medium' | 'low';
}

// News and policy sources for outreach
const NEWS_SOURCES = {
  airbnb: {
    name: 'Airbnb',
    baseUrl: 'https://www.airbnb.com',
    blogUrl: 'https://www.airbnb.com/press/news',
    policyUrl: 'https://www.airbnb.com/help/article/2855',
    helpUrl: 'https://www.airbnb.com/help',
    selectors: {
      title: 'h1, .post-title, .entry-title, .headline, .help-article-title',
      content: '.post-content, .entry-content, .article-content, .content, .help-article-content',
      date: 'time[datetime], .post-date, .entry-date, .publish-date',
      author: '.author, .byline, .post-author',
      summary: '.excerpt, .summary, .description',
    },
    categories: ['policy', 'announcements', 'updates', 'new-features'],
  },
  booking: {
    name: 'Booking.com',
    baseUrl: 'https://www.booking.com',
    blogUrl: 'https://www.booking.com/content/policies.html',
    policyUrl: 'https://www.booking.com/content/policies.html',
    helpUrl: 'https://www.booking.com/content/help.html',
    selectors: {
      title: 'h1, .article-title, .post-title, .headline',
      content: '.article-content, .post-content, .content',
      date: 'time[datetime], .publish-date, .article-date',
      author: '.author, .byline, .writer',
      summary: '.excerpt, .summary, .description',
    },
    categories: ['policy', 'announcements', 'updates', 'new-features'],
  },
  expedia: {
    name: 'Expedia',
    baseUrl: 'https://www.expedia.com',
    blogUrl: 'https://www.expedia.com/help',
    policyUrl: 'https://www.expedia.com/help',
    helpUrl: 'https://www.expedia.com/help',
    selectors: {
      title: 'h1, .article-title, .post-title, .headline',
      content: '.article-content, .post-content, .content',
      date: 'time[datetime], .publish-date, .article-date',
      author: '.author, .byline, .writer',
      summary: '.excerpt, .summary, .description',
    },
    categories: ['policy', 'announcements', 'updates', 'new-features'],
  },
  getyourguide: {
    name: 'GetYourGuide',
    baseUrl: 'https://www.getyourguide.com',
    blogUrl: 'https://www.getyourguide.com/help',
    policyUrl: 'https://www.getyourguide.com/help',
    helpUrl: 'https://www.getyourguide.com/help',
    selectors: {
      title: 'h1, .article-title, .post-title, .headline',
      content: '.article-content, .post-content, .content',
      date: 'time[datetime], .publish-date, .article-date',
      author: '.author, .byline, .writer',
      summary: '.excerpt, .summary, .description',
    },
    categories: ['policy', 'announcements', 'updates', 'new-features'],
  },
  viator: {
    name: 'Viator',
    baseUrl: 'https://www.viator.com',
    blogUrl: 'https://www.viator.com/help',
    policyUrl: 'https://www.viator.com/help',
    helpUrl: 'https://www.viator.com/help',
    selectors: {
      title: 'h1, .article-title, .post-title, .headline',
      content: '.article-content, .post-content, .content',
      date: 'time[datetime], .publish-date, .article-date',
      author: '.author, .byline, .writer',
      summary: '.excerpt, .summary, .description',
    },
    categories: ['policy', 'announcements', 'updates', 'new-features'],
  },
};

// Alternative content sources that are more accessible
const ALTERNATIVE_SOURCES = {
  reddit: {
    name: 'Reddit',
    urls: [
      'https://www.reddit.com/r/AirBnB/hot.json',
      'https://www.reddit.com/r/airbnb_hosts/hot.json',
      'https://www.reddit.com/r/airbnb/hot.json',
      'https://www.reddit.com/r/travel/hot.json',
    ],
    selectors: {
      title: '.title',
      content: '.selftext',
      date: '.created_utc',
      author: '.author',
      score: '.score',
    },
  },
  quora: {
    name: 'Quora',
    urls: [
      'https://www.quora.com/topic/Airbnb',
      'https://www.quora.com/topic/Booking-com',
      'https://www.quora.com/topic/Online-Travel-Agencies',
    ],
    selectors: {
      title: '.question_text',
      content: '.answer_text',
      date: '.answer_date',
      author: '.answer_author',
    },
  },
  industry_blogs: {
    name: 'Industry Blogs',
    urls: [
      'https://skift.com/tag/airbnb/',
      'https://skift.com/tag/booking-com/',
      'https://www.phocuswire.com/airbnb',
      'https://www.phocuswire.com/booking-com',
      'https://www.travelweekly.com/Travel-News/Hotel-News/Airbnb',
      'https://www.travelweekly.com/Travel-News/Hotel-News/Booking-com',
    ],
    selectors: {
      title: 'h1, h2, .title, .headline',
      content: '.content, .article-content, .post-content',
      date: 'time, .date, .published',
      author: '.author, .byline',
    },
  },
};

// Policy-related keywords for filtering
const POLICY_KEYWORDS = [
  'policy', 'policy change', 'new policy', 'updated policy',
  'terms', 'terms of service', 'terms and conditions',
  'announcement', 'announce', 'new feature', 'update',
  'cancellation', 'refund', 'booking', 'pricing',
  'fee', 'commission', 'host', 'guest', 'safety',
  'verification', 'identity', 'payment', 'payout',
  'superhost', 'instant book', 'cleaning fee',
  'service fee', 'occupancy tax', 'regulation',
  'compliance', 'legal', 'law', 'government',
  'covid', 'coronavirus', 'pandemic', 'health',
  'security', 'privacy', 'data', 'gdpr',
];

// High-priority keywords for immediate outreach
const HIGH_PRIORITY_KEYWORDS = [
  'policy change', 'new policy', 'announcement',
  'cancellation policy', 'refund policy', 'booking policy',
  'fee change', 'commission change', 'pricing change',
  'safety update', 'verification update', 'payment update',
  'legal requirement', 'compliance update', 'regulation',
];

async function crawlNewsSource(source: any, url: string): Promise<NewsArticle | null> {
  try {
    console.log(`[NEWS] Crawling ${source.name} news: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    
    // Extract title
    const title = $(source.selectors.title).first().text().trim();
    if (!title) {
      console.log(`[NEWS] No title found for ${url}`);
      return null;
    }

    // Extract content
    const content = $(source.selectors.content).first().text().trim();
    if (!content || content.length < 100) {
      console.log(`[NEWS] Insufficient content for ${url}`);
      return null;
    }

    // Extract date
    const date = $(source.selectors.date).first().attr('datetime') || 
                 $(source.selectors.date).first().text().trim();

    // Extract author
    const author = $(source.selectors.author).first().text().trim();

    // Extract summary
    const summary = $(source.selectors.summary).first().text().trim();

    // Determine content type and priority
    const contentType = determineContentType(title, content);
    const priority = determinePriority(title, content);

    // Check if it's policy-related
    const isPolicyRelated = POLICY_KEYWORDS.some(keyword => 
      title.toLowerCase().includes(keyword) || content.toLowerCase().includes(keyword)
    );

    if (!isPolicyRelated) {
      console.log(`[NEWS] Not policy-related, skipping: ${title}`);
      return null;
    }

    // Detect language
    const languageDetection = await detectLanguage(content);
    if (languageDetection.language !== 'en') {
      console.log(`[NEWS] Non-English content, skipping: ${languageDetection.language}`);
      return null;
    }

    return {
      url,
      title,
      content,
      platform: source.name,
      category: contentType,
      publishDate: date,
      author,
      summary,
      contentType,
      priority,
    };

  } catch (error) {
    console.error(`[NEWS] Error crawling ${url}:`, error);
    return null;
  }
}

function determineContentType(title: string, content: string): 'news' | 'policy' | 'announcement' {
  const text = `${title} ${content}`.toLowerCase();
  
  if (text.includes('policy') || text.includes('terms') || text.includes('legal')) {
    return 'policy';
  }
  if (text.includes('announce') || text.includes('new feature') || text.includes('update')) {
    return 'announcement';
  }
  return 'news';
}

function determinePriority(title: string, content: string): 'high' | 'medium' | 'low' {
  const text = `${title} ${content}`.toLowerCase();
  
  if (HIGH_PRIORITY_KEYWORDS.some(keyword => text.includes(keyword))) {
    return 'high';
  }
  if (POLICY_KEYWORDS.some(keyword => text.includes(keyword))) {
    return 'medium';
  }
  return 'low';
}

async function saveNewsArticle(article: NewsArticle): Promise<void> {
  try {
    // Check if article already exists
    const existing = await prisma.article.findUnique({
      where: { url: article.url }
    });

    if (existing) {
      console.log(`[NEWS] Article already exists: ${article.url}`);
      return;
    }

    // Generate unique slug
    const baseSlug = slugify(article.title);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await prisma.article.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Generate embeddings for content
    const paragraphs = article.content.split('\n\n').filter(p => p.trim().length > 50);
    const paragraphsWithEmbeddings = [];

    for (const paragraph of paragraphs.slice(0, 5)) {
      try {
        const embedding = await getEmbedding(paragraph);
        paragraphsWithEmbeddings.push({ text: paragraph, embedding });
      } catch (error) {
        console.error(`[NEWS] Error generating embedding:`, error);
      }
    }

    // Save to database - store priority in category field
    await prisma.article.create({
      data: {
        url: article.url,
        question: article.title,
        answer: article.content,
        slug: uniqueSlug,
        category: `${article.platform} ${article.category} [${article.priority.toUpperCase()}]`,
        platform: article.platform,
        contentType: 'news',
        source: 'news',
        author: article.author,
        language: 'en',
        crawlStatus: 'active',
      }
    });

    console.log(`[NEWS] Saved: ${article.title} (${article.priority} priority)`);

  } catch (error) {
    console.error(`[NEWS] Error saving article:`, error);
  }
}

export async function crawlNewsAndPolicies(): Promise<NewsArticle[]> {
  console.log('[NEWS] Starting news and policy crawling...');
  
  const articles: NewsArticle[] = [];
  
  // Crawl each news source
  for (const [key, source] of Object.entries(NEWS_SOURCES)) {
    try {
      console.log(`[NEWS] Crawling ${source.name}...`);
      
      // Crawl blog posts
      const blogArticle = await crawlNewsSource(source, source.blogUrl);
      if (blogArticle) {
        articles.push(blogArticle);
      }
      
      // Crawl policy pages
      const policyArticle = await crawlNewsSource(source, source.policyUrl);
      if (policyArticle) {
        articles.push(policyArticle);
      }
      
      // Add delay between sources
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error(`[NEWS] Error crawling ${source.name}:`, error);
    }
  }
  
  console.log(`[NEWS] Found ${articles.length} policy-related articles`);
  
  // Save articles to database
  for (const article of articles) {
    await saveNewsArticle(article);
  }
  
  return articles;
}

// Function to get high-priority articles for outreach
export async function getHighPriorityArticles(): Promise<NewsArticle[]> {
  const articles = await prisma.article.findMany({
    where: {
      contentType: 'news',
      category: {
        contains: '[HIGH]'
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  });

  return articles.map(article => {
    // Extract priority from category field
    const priorityMatch = article.category.match(/\[(HIGH|MEDIUM|LOW)\]/);
    const priority = priorityMatch ? priorityMatch[1].toLowerCase() as 'high' | 'medium' | 'low' : 'medium';
    
    // Extract platform and content type from category
    const categoryParts = article.category.split(' ');
    const platform = categoryParts[0];
    const contentType = categoryParts[1] as 'news' | 'policy' | 'announcement';
    
    return {
      url: article.url,
      title: article.question,
      content: article.answer,
      platform,
      category: article.category,
      contentType,
      priority,
      publishDate: undefined,
      author: article.author || undefined,
      summary: undefined,
      tags: undefined,
    };
  });
} 