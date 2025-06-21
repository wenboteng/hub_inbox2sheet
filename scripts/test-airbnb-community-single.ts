#!/usr/bin/env tsx

import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import { cleanText } from '../src/utils/parseHelpers';
import { detectLanguage } from '../src/utils/languageDetection';

const prisma = new PrismaClient();

// Test URL - a known Airbnb Community thread
const TEST_URL = 'https://community.withairbnb.com/t5/Hosting/When-does-Airbnb-pay-hosts/td-p/184758';

async function testSingleThread() {
  console.log('🧪 Testing Single Thread Extraction');
  console.log('===================================');
  console.log(`🔗 Test URL: ${TEST_URL}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('📄 Loading page...');
    await page.goto(TEST_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Test selectors
    console.log('\n🔍 Testing Selectors:');
    
    // Test thread title
    const title = await page.evaluate(() => {
      const selectors = ['.lia-message-subject', '.page-title', '.topic-title', 'h1'];
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return { selector, text: element.textContent?.trim() || '' };
        }
      }
      return { selector: 'none', text: '' };
    });
    console.log(`  Title (${title.selector}): "${title.text}"`);
    
    // Test thread content
    const content = await page.evaluate(() => {
      const selectors = ['.lia-message-body-content', '.lia-message-body'];
      for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          const text = elements.map(el => el.textContent?.trim() || '').join('\n');
          return { selector, text, count: elements.length };
        }
      }
      return { selector: 'none', text: '', count: 0 };
    });
    console.log(`  Content (${content.selector}): ${content.count} elements, ${content.text.length} chars`);
    
    // Test thread author
    const author = await page.evaluate(() => {
      const selectors = ['.lia-user-name', '.author-name', '.user-name'];
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return { selector, text: element.textContent?.trim() || '' };
        }
      }
      return { selector: 'none', text: '' };
    });
    console.log(`  Author (${author.selector}): "${author.text}"`);
    
    // Test reply posts
    const replies = await page.evaluate(() => {
      const selectors = ['.lia-message-body', '.lia-message', 'article.lia-message-body'];
      for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          return { selector, count: elements.length };
        }
      }
      return { selector: 'none', count: 0 };
    });
    console.log(`  Reply posts (${replies.selector}): ${replies.count} found`);
    
    // Test if we can extract meaningful content
    if (title.text && content.text) {
      console.log('\n✅ Content extraction successful!');
      
      const cleanedContent = cleanText(content.text);
      const language = await detectLanguage(cleanedContent);
      
      console.log(`  Language detected: ${language}`);
      console.log(`  Content preview: "${cleanedContent.substring(0, 200)}..."`);
      
      // Test database save (optional - uncomment if you want to test DB)
      /*
      const slug = title.text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      
      try {
        await prisma.article.create({
          data: {
            url: TEST_URL,
            question: title.text,
            answer: cleanedContent,
            slug,
            category: 'Airbnb Community',
            platform: 'Airbnb',
            contentType: 'community',
            source: 'community',
            author: author.text || 'Anonymous',
            language: language === 'en' ? 'en' : 'unknown',
            crawlStatus: 'active',
          }
        });
        console.log('✅ Database save successful!');
      } catch (error) {
        console.log('⚠️  Database save failed (might be duplicate):', error);
      }
      */
      
    } else {
      console.log('\n❌ Content extraction failed!');
      console.log('  Title found:', !!title.text);
      console.log('  Content found:', !!content.text);
    }
    
    // Save HTML for debugging
    const html = await page.content();
    const fs = require('fs');
    fs.writeFileSync('airbnb-community-test.html', html);
    console.log('\n💾 HTML saved to airbnb-community-test.html for debugging');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

testSingleThread()
  .then(() => {
    console.log('\n🏁 Single thread test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  }); 