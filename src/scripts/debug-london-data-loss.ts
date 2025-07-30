import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugLondonDataLoss() {
  console.log('🔍 DEBUGGING LONDON DATA LOSS...\n');

  try {
    // Check original imported data
    console.log('📊 ORIGINAL IMPORTED DATA:');
    console.log('==========================');
    
    const originalGYG = await prisma.importedGYGActivity.count();
    const originalViator = await prisma.importedMadridActivity.count();
    
    console.log(`Original GYG Activities: ${originalGYG}`);
    console.log(`Original Viator Activities: ${originalViator}`);
    
    // Check London activities in original data
    const originalLondonGYG = await prisma.importedGYGActivity.count({
      where: {
        OR: [
          { city: { contains: 'London', mode: 'insensitive' } },
          { location: { contains: 'London', mode: 'insensitive' } }
        ]
      }
    });
    
    console.log(`Original London GYG Activities: ${originalLondonGYG}`);
    
    // Check cleaned data
    console.log('\n🧹 CLEANED DATA:');
    console.log('=================');
    
    const cleanedTotal = await prisma.cleanedActivity.count();
    const cleanedLondon = await prisma.cleanedActivity.count({
      where: { city: 'London' }
    });
    
    console.log(`Total Cleaned Activities: ${cleanedTotal}`);
    console.log(`Cleaned London Activities: ${cleanedLondon}`);
    
    // Calculate data loss
    const dataLoss = originalLondonGYG - cleanedLondon;
    const dataLossPercentage = Math.round((dataLoss / originalLondonGYG) * 100);
    
    console.log(`\n📉 DATA LOSS ANALYSIS:`);
    console.log(`Original London: ${originalLondonGYG}`);
    console.log(`Cleaned London: ${cleanedLondon}`);
    console.log(`Data Lost: ${dataLoss} activities (${dataLossPercentage}%)`);
    
    // Check what happened during cleaning
    console.log('\n🔍 CLEANING PROCESS ANALYSIS:');
    console.log('=============================');
    
    // Check quality scores for London activities
    const londonQualityScores = await prisma.cleanedActivity.findMany({
      where: { city: 'London' },
      select: {
        qualityScore: true,
        platform: true,
        originalSource: true
      },
      take: 20
    });
    
    console.log('\nLondon Activities Quality Scores (sample):');
    londonQualityScores.forEach((activity, index) => {
      console.log(`${index + 1}. Quality: ${activity.qualityScore}% | Platform: ${activity.platform} | Source: ${activity.originalSource}`);
    });
    
    // Check if there are London activities that didn't make it through cleaning
    console.log('\n🔍 CHECKING FOR LOST LONDON DATA:');
    console.log('==================================');
    
    // Look for London activities in imported data that might not be in cleaned data
    const importedLondonActivities = await prisma.importedGYGActivity.findMany({
      where: {
        OR: [
          { city: { contains: 'London', mode: 'insensitive' } },
          { location: { contains: 'London', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        activityName: true,
        city: true,
        location: true,
        extractionQuality: true,
        priceNumeric: true,
        ratingNumeric: true,
        reviewCountNumeric: true
      },
      take: 20
    });
    
    console.log('\nSample London Activities in Imported Data:');
    importedLondonActivities.forEach((activity, index) => {
      console.log(`${index + 1}. "${activity.activityName.substring(0, 60)}..."`);
      console.log(`   City: "${activity.city}" | Location: "${activity.location}" | Quality: ${activity.extractionQuality}`);
      console.log(`   Price: ${activity.priceNumeric} | Rating: ${activity.ratingNumeric} | Reviews: ${activity.reviewCountNumeric}`);
    });
    
    // Check cleaning configuration
    console.log('\n⚙️ CLEANING CONFIGURATION:');
    console.log('==========================');
    
    // Check what quality threshold was used
    const qualityThreshold = 70; // This should match your cleaning config
    console.log(`Quality Threshold: ${qualityThreshold}%`);
    
    // Simulate quality score calculation for some London activities
    console.log('\n🧮 QUALITY SCORE SIMULATION:');
    console.log('============================');
    
    const sampleForQualityCheck = await prisma.importedGYGActivity.findMany({
      where: {
        OR: [
          { city: { contains: 'London', mode: 'insensitive' } },
          { location: { contains: 'London', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        activityName: true,
        providerName: true,
        location: true,
        city: true,
        country: true,
        priceNumeric: true,
        priceText: true,
        ratingNumeric: true,
        ratingText: true,
        reviewCountNumeric: true,
        reviewCountText: true,
        description: true,
        duration: true,
        url: true
      },
      take: 10
    });
    
    console.log('\nQuality Score Calculation for Sample London Activities:');
    sampleForQualityCheck.forEach((activity, index) => {
      const qualityScore = calculateQualityScore(activity);
      const passed = qualityScore >= qualityThreshold;
      console.log(`${index + 1}. "${activity.activityName.substring(0, 50)}..."`);
      console.log(`   Quality Score: ${qualityScore}% | Passed: ${passed ? '✅' : '❌'}`);
      console.log(`   Has Name: ${!!activity.activityName} | Has Provider: ${!!activity.providerName}`);
      console.log(`   Has Location: ${!!activity.location} | Has City: ${!!activity.city}`);
      console.log(`   Has Price: ${!!activity.priceNumeric} | Has Rating: ${!!activity.ratingNumeric}`);
      console.log(`   Has Reviews: ${!!activity.reviewCountNumeric} | Has Description: ${!!activity.description}`);
      console.log('');
    });
    
    // Check for data in different city formats
    console.log('\n🔍 CHECKING DIFFERENT CITY FORMATS:');
    console.log('===================================');
    
    const cityVariations = await prisma.cleanedActivity.groupBy({
      by: ['city'],
      where: {
        OR: [
          { city: { contains: 'london', mode: 'insensitive' } },
          { location: { contains: 'london', mode: 'insensitive' } }
        ]
      },
      _count: { city: true }
    });
    
    console.log('City variations found:');
    cityVariations.forEach(variation => {
      console.log(`  "${variation.city}": ${variation._count.city} activities`);
    });
    
    // Check if there are London activities in other tables
    console.log('\n🔍 CHECKING OTHER DATA SOURCES:');
    console.log('===============================');
    
    // Check UserProduct table for London data
    const userProductLondon = await prisma.userProduct.count({
      where: {
        OR: [
          { city: { contains: 'London', mode: 'insensitive' } },
          { location: { contains: 'London', mode: 'insensitive' } }
        ]
      }
    });
    
    console.log(`UserProduct London Activities: ${userProductLondon}`);
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('===================');
    console.log('1. Check if London activities were filtered out during cleaning');
    console.log('2. Verify quality score calculation for London activities');
    console.log('3. Check if there are London activities in other tables');
    console.log('4. Review cleaning pipeline configuration');
    console.log('5. Consider re-running data collection for London specifically');
    console.log('6. Lower quality threshold temporarily to see what data is being lost');
    
  } catch (error) {
    console.error('❌ Error debugging London data loss:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Quality score calculation function (copied from cleaning pipeline)
function calculateQualityScore(activity: any): number {
  let score = 0;
  let maxScore = 0;
  
  // Basic required fields (40 points)
  maxScore += 40;
  if (activity.activityName && activity.activityName.trim()) score += 10;
  if (activity.providerName && activity.providerName.trim()) score += 10;
  if (activity.location && activity.location.trim()) score += 10;
  if (activity.city && activity.city.trim()) score += 10;
  
  // Pricing data (20 points)
  maxScore += 20;
  if (activity.priceNumeric && activity.priceNumeric > 0) score += 10;
  if (activity.priceText) score += 10;
  
  // Rating data (20 points)
  maxScore += 20;
  if (activity.ratingNumeric && activity.ratingNumeric > 0) score += 10;
  if (activity.reviewCountNumeric && activity.reviewCountNumeric > 0) score += 10;
  
  // Additional data (20 points)
  maxScore += 20;
  if (activity.description && activity.description.trim()) score += 5;
  if (activity.duration && activity.duration.trim()) score += 5;
  if (activity.url) score += 5;
  if (activity.country && activity.country.trim()) score += 5;
  
  return Math.round((score / maxScore) * 100);
}

debugLondonDataLoss().catch(console.error); 