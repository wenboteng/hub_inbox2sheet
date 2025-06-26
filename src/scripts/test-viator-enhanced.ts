import { fetchHtml } from '../utils/fetchHtml';
import { parseContent, cleanText } from '../utils/parseHelpers';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { slugify } from '../utils/slugify';

const prisma = new PrismaClient();

// Comprehensive list of discovered Viator article URLs
const VIATOR_ARTICLE_URLS = [
  'https://www.viator.com/help/articles/35',
  'https://www.viator.com/help/articles/33',
  'https://www.viator.com/help/articles/24',
  'https://www.viator.com/help/articles/81',
  'https://www.viator.com/help/articles/5',
  'https://www.viator.com/help/articles/6',
  'https://www.viator.com/help/articles/7',
  'https://www.viator.com/help/articles/11',
  'https://www.viator.com/help/articles/12',
  'https://www.viator.com/help/articles/14',
  'https://www.viator.com/help/articles/15',
  'https://www.viator.com/help/articles/16',
  'https://www.viator.com/help/articles/17',
  'https://www.viator.com/help/articles/18',
  'https://www.viator.com/help/articles/19',
  'https://www.viator.com/help/articles/23',
  'https://www.viator.com/help/articles/25',
  'https://www.viator.com/help/articles/26',
  'https://www.viator.com/help/articles/27',
  'https://www.viator.com/help/articles/28',
  'https://www.viator.com/help/articles/29',
  'https://www.viator.com/help/articles/30',
  'https://www.viator.com/help/articles/31',
  'https://www.viator.com/help/articles/34',
  'https://www.viator.com/help/articles/36',
  'https://www.viator.com/help/articles/37',
  'https://www.viator.com/help/articles/39',
  'https://www.viator.com/help/articles/40',
  'https://www.viator.com/help/articles/42',
  'https://www.viator.com/help/articles/45',
  'https://www.viator.com/help/articles/46',
  'https://www.viator.com/help/articles/47',
  'https://www.viator.com/help/articles/48',
  'https://www.viator.com/help/articles/49',
  'https://www.viator.com/help/articles/50',
  'https://www.viator.com/help/articles/51',
  'https://www.viator.com/help/articles/52',
  'https://www.viator.com/help/articles/53',
  'https://www.viator.com/help/articles/54',
  'https://www.viator.com/help/articles/55',
  'https://www.viator.com/help/articles/56',
  'https://www.viator.com/help/articles/58',
  'https://www.viator.com/help/articles/59',
  'https://www.viator.com/help/articles/60',
];

async function crawlViatorArticle(url: string) {
  console.log(`[VIATOR-ENHANCED] Crawling ${url}`);
  
  try {
    const html = await fetchHtml(url);
    const parsed = parseContent(html, {
      title: 'h1, .article-title, .help-center-title, .page-title, .title',
      content: '.article-content, .help-center-content, .article-body, .content, .article-text',
    });
    
    if (!parsed.title || parsed.title.trim() === '') {
      const $ = cheerio.load(html);
      const alternativeTitles = [
        $('title').text().trim(),
        $('meta[property="og:title"]').attr('content') || '',
      ].filter(title => title && title.length > 0);
      
      if (alternativeTitles.length > 0) {
        parsed.title = alternativeTitles[0];
      } else {
        const urlParts = url.split('/');
        const articleId = urlParts[urlParts.length - 1];
        parsed.title = `Viator Help Article ${articleId}`;
      }
    }
    
    if (!parsed.content || parsed.content.trim() === '') {
      const $ = cheerio.load(html);
      const alternativeContent = [
        $('main').text().trim(),
        $('article').text().trim(),
        $('body').text().trim(),
      ].filter(content => content && content.length > 100);
      
      if (alternativeContent.length > 0) {
        parsed.content = alternativeContent[0];
      }
    }
    
    if (!parsed.title || parsed.title.trim() === '') {
      const urlParts = url.split('/');
      const articleId = urlParts[urlParts.length - 1];
      parsed.title = `Viator Help Article ${articleId}`;
    }
    
    if (!parsed.content || parsed.content.trim() === '') {
      parsed.content = 'Content not available';
    }
    
    const cleanedContent = cleanText(parsed.content);
    
    return {
      platform: 'Viator',
      url,
      question: parsed.title,
      answer: cleanedContent,
    };
  } catch (error) {
    console.error(`[VIATOR-ENHANCED] Error crawling ${url}:`, error);
    const urlParts = url.split('/');
    const articleId = urlParts[urlParts.length - 1];
    return {
      platform: 'Viator',
      url,
      question: `Viator Help Article ${articleId}`,
      answer: 'Content not available due to crawling error',
    };
  }
}

async function saveToDatabase(article: any) {
  try {
    const existing = await prisma.article.findUnique({
      where: { url: article.url }
    });

    if (existing) {
      console.log(`[VIATOR-ENHANCED] Article already exists: ${article.url}`);
      return false;
    }

    const baseSlug = slugify(article.question);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await prisma.article.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    await prisma.article.create({
      data: {
        url: article.url,
        question: article.question,
        answer: article.answer,
        slug: uniqueSlug,
        category: 'Help Center',
        platform: article.platform,
        contentType: 'official',
        source: 'official',
        language: 'en',
        crawlStatus: 'active',
      }
    });

    console.log(`[VIATOR-ENHANCED] Saved: ${article.question}`);
    return true;
  } catch (error) {
    console.error(`[VIATOR-ENHANCED] Error saving article:`, error);
    return false;
  }
}

async function testEnhancedViatorCrawler() {
  console.log('[VIATOR-ENHANCED] Starting enhanced Viator crawler test...');
  console.log(`[VIATOR-ENHANCED] Total URLs to process: ${VIATOR_ARTICLE_URLS.length}`);
  
  let successCount = 0;
  let errorCount = 0;
  let newArticlesCount = 0;
  
  for (const url of VIATOR_ARTICLE_URLS) {
    try {
      const article = await crawlViatorArticle(url);
      
      if (article.question && article.question.trim() !== '' && 
          article.answer && article.answer.length > 50) {
        
        const saved = await saveToDatabase(article);
        if (saved) {
          newArticlesCount++;
        }
        successCount++;
        console.log(`[VIATOR-ENHANCED] Success: "${article.question}" (${article.answer.length} chars)`);
      } else {
        console.log(`[VIATOR-ENHANCED] Skipping invalid article: "${article.question}" (${article.answer.length} chars)`);
        errorCount++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[VIATOR-ENHANCED] Failed to process ${url}:`, error);
      errorCount++;
    }
  }
  
  console.log('\n[VIATOR-ENHANCED] ===== CRAWL RESULTS =====');
  console.log(`Total URLs processed: ${VIATOR_ARTICLE_URLS.length}`);
  console.log(`Successful crawls: ${successCount}`);
  console.log(`Failed crawls: ${errorCount}`);
  console.log(`New articles added: ${newArticlesCount}`);
  
  const totalViatorArticles = await prisma.article.count({
    where: { platform: 'Viator' }
  });
  console.log(`Total Viator articles in database: ${totalViatorArticles}`);
  
  await prisma.$disconnect();
}

testEnhancedViatorCrawler().catch(console.error); 