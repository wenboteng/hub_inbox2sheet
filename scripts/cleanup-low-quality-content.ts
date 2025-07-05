#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Keywords to identify low-quality content
const LOW_QUALITY_KEYWORDS = [
  'mobile', 'phone', 'signal', 'wifi', 'internet', 'connection',
  'roaming', 'data', 'sim card', 'network', 'coverage',
  'javascript', 'script', 'function', 'document', 'window',
  'undefined', 'null', 'error', 'exception', 'debug',
  'ta && ta.queueForLoad', 'document.addEventListener',
  'DOMContentLoaded', 'queueForLoad'
];

// Keywords to identify tour vendor related content
const TOUR_VENDOR_KEYWORDS = [
  'tour', 'guide', 'booking', 'reservation', 'package', 'excursion',
  'activity', 'attraction', 'museum', 'sightseeing', 'guided tour',
  'day trip', 'city tour', 'adventure', 'experience', 'ticket',
  'entrance', 'admission', 'visit', 'explore', 'discover',
  'vacation', 'holiday', 'travel', 'trip', 'destination',
  'hotel', 'accommodation', 'stay', 'lodging', 'resort',
  'cruise', 'sailing', 'boat', 'ferry', 'transportation',
  'airline', 'flight', 'airport', 'travel agent', 'agency'
];

// Check if content is low quality
function isLowQuality(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Check for low quality keywords
  for (const keyword of LOW_QUALITY_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  // Check for empty or very short content
  if (text.trim().length < 20) {
    return true;
  }
  
  // Check for content that's too long (likely contains artifacts)
  if (text.length > 5000) {
    return true;
  }
  
  return false;
}

// Check if content is tour vendor related
function isTourVendorRelated(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  for (const keyword of TOUR_VENDOR_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

// Check if content has empty question
function hasEmptyQuestion(question: string): boolean {
  return !question || question.trim().length === 0;
}

async function cleanupLowQualityContent() {
  console.log('🧹 CLEANING UP LOW-QUALITY CONTENT');
  console.log('===================================');
  
  try {
    await prisma.$connect();
    
    // Get all articles
    const allArticles = await prisma.article.findMany({
      select: {
        id: true,
        url: true,
        question: true,
        answer: true,
        platform: true,
        category: true,
        contentType: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📊 Total articles in database: ${allArticles.length}`);
    
    const articlesToDelete: string[] = [];
    const articlesToKeep: string[] = [];
    
    // Analyze each article
    for (const article of allArticles) {
      let shouldDelete = false;
      const reasons: string[] = [];
      
      // Check for empty questions
      if (hasEmptyQuestion(article.question)) {
        shouldDelete = true;
        reasons.push('Empty question');
      }
      
      // Check for low quality content
      if (isLowQuality(article.answer)) {
        shouldDelete = true;
        reasons.push('Low quality content');
      }
      
      // For TripAdvisor articles, check if they're tour vendor related
      if (article.platform === 'TripAdvisor' && !isTourVendorRelated(article.answer)) {
        shouldDelete = true;
        reasons.push('Not tour vendor related');
      }
      
      if (shouldDelete) {
        articlesToDelete.push(article.id);
        console.log(`❌ Will delete: ${article.platform} - ${reasons.join(', ')}`);
        console.log(`   Question: "${article.question}"`);
        console.log(`   Answer: "${article.answer.substring(0, 100)}..."`);
      } else {
        articlesToKeep.push(article.id);
      }
    }
    
    console.log(`\n📈 CLEANUP SUMMARY:`);
    console.log(`   Articles to keep: ${articlesToKeep.length}`);
    console.log(`   Articles to delete: ${articlesToDelete.length}`);
    
    if (articlesToDelete.length > 0) {
      console.log(`\n🗑️  DELETING ${articlesToDelete.length} LOW-QUALITY ARTICLES...`);
      
      // Delete articles in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < articlesToDelete.length; i += batchSize) {
        const batch = articlesToDelete.slice(i, i + batchSize);
        await prisma.article.deleteMany({
          where: {
            id: { in: batch }
          }
        });
        console.log(`   Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articlesToDelete.length / batchSize)}`);
      }
      
      console.log(`✅ Successfully deleted ${articlesToDelete.length} low-quality articles`);
    } else {
      console.log(`✅ No low-quality articles found to delete`);
    }
    
    // Show final statistics
    const finalCount = await prisma.article.count();
    console.log(`\n📊 FINAL STATISTICS:`);
    console.log(`   Remaining articles: ${finalCount}`);
    
    // Show breakdown by platform
    const platformStats = await prisma.article.groupBy({
      by: ['platform'],
      _count: { platform: true }
    });
    
    console.log(`\n📋 PLATFORM BREAKDOWN:`);
    platformStats.forEach(stat => {
      console.log(`   ${stat.platform}: ${stat._count.platform} articles`);
    });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup if this file is executed directly
if (require.main === module) {
  cleanupLowQualityContent().then(() => {
    console.log('🧹 Cleanup completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
} 