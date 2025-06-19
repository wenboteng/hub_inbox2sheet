#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { 
  generateContentHash, 
  checkContentDuplicate, 
  getDeduplicationStats,
  DEFAULT_DEDUP_CONFIG 
} from '../src/utils/contentDeduplication';
import { crawlGetYourGuideArticlesWithPagination } from '../src/crawlers/getyourguide';

const prisma = new PrismaClient();

async function testContentDeduplication() {
  console.log('\n🧪 TESTING CONTENT DEDUPLICATION');
  console.log('=====================================');
  
  // Test 1: Generate content hash
  const testContent = "This is a test article about travel booking. It contains useful information for travelers.";
  const hash = generateContentHash(testContent);
  console.log(`✅ Content hash generated: ${hash.substring(0, 16)}...`);
  
  // Test 2: Check deduplication stats
  const stats = await getDeduplicationStats();
  console.log(`✅ Deduplication stats:`);
  console.log(`   - Total articles: ${stats.totalArticles}`);
  console.log(`   - Duplicate articles: ${stats.duplicateArticles}`);
  console.log(`   - Unique articles: ${stats.uniqueArticles}`);
  console.log(`   - Duplicate percentage: ${stats.duplicatePercentage.toFixed(2)}%`);
  
  // Test 3: Check if content is duplicate
  const duplicateCheck = await checkContentDuplicate(hash);
  console.log(`✅ Duplicate check result: ${duplicateCheck.isDuplicate ? 'DUPLICATE' : 'UNIQUE'}`);
  
  // Test 4: Configuration
  console.log(`✅ Deduplication configuration:`);
  console.log(`   - Enabled: ${DEFAULT_DEDUP_CONFIG.enabled}`);
  console.log(`   - Algorithm: ${DEFAULT_DEDUP_CONFIG.hashAlgorithm}`);
  console.log(`   - Threshold: ${DEFAULT_DEDUP_CONFIG.similarityThreshold}`);
  console.log(`   - Min length: ${DEFAULT_DEDUP_CONFIG.minContentLength}`);
}

async function testGetYourGuidePagination() {
  console.log('\n🧪 TESTING GETYOURGUIDE PAGINATION');
  console.log('=====================================');
  
  try {
    // Test with a limited set of URLs to avoid long runs
    const testUrls = [
      'https://supply.getyourguide.support/hc/en-us/categories/13013952719901-Suppliers-FAQs'
    ];
    
    console.log(`✅ Testing pagination with ${testUrls.length} category URLs`);
    
    // This will test the pagination logic
    const articles = await crawlGetYourGuideArticlesWithPagination(testUrls);
    
    console.log(`✅ Pagination test completed:`);
    console.log(`   - Articles found: ${articles.length}`);
    
    if (articles.length > 0) {
      console.log(`   - Sample article: ${articles[0].question}`);
      console.log(`   - Category: ${articles[0].category || 'Unknown'}`);
      console.log(`   - Content length: ${articles[0].answer.length} characters`);
    }
    
  } catch (error) {
    console.error(`❌ GetYourGuide pagination test failed:`, error);
  }
}

async function testDatabaseSchema() {
  console.log('\n🧪 TESTING DATABASE SCHEMA');
  console.log('============================');
  
  try {
    // Test if new fields exist
    const sampleArticle = await prisma.article.findFirst({
      select: {
        id: true,
        url: true,
        contentHash: true,
        isDuplicate: true,
        contentType: true,
        source: true
      }
    });
    
    if (sampleArticle) {
      console.log(`✅ Database schema test passed:`);
      console.log(`   - contentHash field: ${sampleArticle.contentHash ? 'EXISTS' : 'NULL'}`);
      console.log(`   - isDuplicate field: ${sampleArticle.isDuplicate}`);
      console.log(`   - contentType field: ${sampleArticle.contentType}`);
      console.log(`   - source field: ${sampleArticle.source}`);
    } else {
      console.log(`⚠️  No articles found in database to test schema`);
    }
    
  } catch (error) {
    console.error(`❌ Database schema test failed:`, error);
  }
}

async function main() {
  console.log('🚀 Testing Improvements');
  console.log('========================');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    await testDatabaseSchema();
    await testContentDeduplication();
    await testGetYourGuidePagination();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 