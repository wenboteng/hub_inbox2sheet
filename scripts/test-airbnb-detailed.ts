#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAirbnbDetailed() {
  console.log('🔍 Detailed Airbnb Community Test');
  console.log('==================================');
  
  try {
    // Get the most recent Airbnb Community articles
    const recentArticles = await prisma.article.findMany({
      where: {
        platform: 'Airbnb',
        source: 'community'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        url: true,
        question: true,
        answer: true,
        author: true,
        contentType: true,
        createdAt: true
      }
    });
    
    console.log(`📊 Found ${recentArticles.length} recent Airbnb Community articles`);
    
    for (const article of recentArticles) {
      console.log('\n📄 Article Details:');
      console.log(`  URL: ${article.url}`);
      console.log(`  Title: ${article.question}`);
      console.log(`  Author: ${article.author || 'Unknown'}`);
      console.log(`  Content Type: ${article.contentType}`);
      console.log(`  Created: ${article.createdAt}`);
      console.log(`  Content Length: ${article.answer.length} characters`);
      console.log(`  Content Preview: "${article.answer.substring(0, 200)}..."`);
      
      // Check for common issues
      if (article.question.includes('Douchescherm') || article.question.includes('beschadigd')) {
        console.log(`  ⚠️  WARNING: This appears to be the Dutch redirect issue!`);
      }
      
      if (article.author === 'Anonymous' || !article.author) {
        console.log(`  ⚠️  WARNING: No author found`);
      }
      
      if (article.answer.length < 100) {
        console.log(`  ⚠️  WARNING: Very short content (${article.answer.length} chars)`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAirbnbDetailed(); 