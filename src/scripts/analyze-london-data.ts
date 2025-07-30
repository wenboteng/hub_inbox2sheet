import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeLondonData() {
  console.log('🇬🇧 ANALYZING LONDON TOURISM DATA...\n');

  try {
    // Get London activities count
    const londonActivities = await prisma.cleanedActivity.findMany({
      where: {
        city: 'London'
      }
    });

    console.log(`📊 Total London Activities: ${londonActivities.length}`);

    if (londonActivities.length === 0) {
      console.log('❌ No London activities found in the database');
      return;
    }

    // Platform distribution
    const platformStats = await prisma.cleanedActivity.groupBy({
      by: ['platform'],
      where: { city: 'London' },
      _count: { platform: true }
    });

    console.log('\n🔗 Platform Distribution:');
    platformStats.forEach(stat => {
      console.log(`  ${stat.platform}: ${stat._count.platform} activities`);
    });

    // Category analysis
    const categoryStats = await prisma.cleanedActivity.groupBy({
      by: ['category'],
      where: { 
        city: 'London',
        category: { not: null }
      },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
      take: 10
    });

    console.log('\n🏷️ Top Categories:');
    categoryStats.forEach((stat, index) => {
      console.log(`  ${index + 1}. ${stat.category}: ${stat._count.category} activities`);
    });

    // Price analysis
    const priceStats = await prisma.cleanedActivity.aggregate({
      where: {
        city: 'London',
        priceNumeric: { not: null }
      },
      _avg: { priceNumeric: true },
      _min: { priceNumeric: true },
      _max: { priceNumeric: true },
      _count: { priceNumeric: true }
    });

    console.log('\n💰 Price Analysis:');
    console.log(`  Average Price: £${Math.round((priceStats._avg.priceNumeric || 0) * 100) / 100}`);
    console.log(`  Min Price: £${priceStats._min.priceNumeric || 0}`);
    console.log(`  Max Price: £${priceStats._max.priceNumeric || 0}`);
    console.log(`  Activities with Prices: ${priceStats._count.priceNumeric}`);

    // Rating analysis
    const ratingStats = await prisma.cleanedActivity.aggregate({
      where: {
        city: 'London',
        ratingNumeric: { not: null }
      },
      _avg: { ratingNumeric: true },
      _min: { ratingNumeric: true },
      _max: { ratingNumeric: true },
      _count: { ratingNumeric: true }
    });

    console.log('\n⭐ Rating Analysis:');
    console.log(`  Average Rating: ${Math.round((ratingStats._avg.ratingNumeric || 0) * 10) / 10}/5`);
    console.log(`  Min Rating: ${ratingStats._min.ratingNumeric || 0}/5`);
    console.log(`  Max Rating: ${ratingStats._max.ratingNumeric || 0}/5`);
    console.log(`  Activities with Ratings: ${ratingStats._count.ratingNumeric}`);

    // Top providers
    const providerStats = await prisma.cleanedActivity.groupBy({
      by: ['providerName'],
      where: { city: 'London' },
      _count: { providerName: true },
      orderBy: { _count: { providerName: 'desc' } },
      take: 10
    });

    console.log('\n🏢 Top Providers:');
    providerStats.forEach((stat, index) => {
      console.log(`  ${index + 1}. ${stat.providerName}: ${stat._count.providerName} activities`);
    });

    // Duration analysis
    const durationStats = await prisma.cleanedActivity.groupBy({
      by: ['durationHours'],
      where: { 
        city: 'London',
        durationHours: { not: null }
      },
      _count: { durationHours: true },
      orderBy: { durationHours: 'asc' }
    });

    console.log('\n⏱️ Duration Analysis:');
    durationStats.forEach(stat => {
      console.log(`  ${stat.durationHours}h: ${stat._count.durationHours} activities`);
    });

    // Sample activities for report ideas
    console.log('\n🎯 Sample Activities for Report Ideas:');
    const sampleActivities = await prisma.cleanedActivity.findMany({
      where: { city: 'London' },
      select: {
        activityName: true,
        providerName: true,
        priceNumeric: true,
        ratingNumeric: true,
        category: true,
        platform: true
      },
      take: 10
    });

    sampleActivities.forEach((activity, index) => {
      console.log(`  ${index + 1}. ${activity.activityName.substring(0, 60)}...`);
      console.log(`     Provider: ${activity.providerName}`);
      console.log(`     Price: £${activity.priceNumeric || 'N/A'} | Rating: ${activity.ratingNumeric || 'N/A'}/5`);
      console.log(`     Category: ${activity.category || 'N/A'} | Platform: ${activity.platform}`);
      console.log('');
    });

    // Report suggestions based on data
    console.log('\n📋 LONDON REPORT SUGGESTIONS:');
    console.log('==============================');
    
    if (priceStats._count.priceNumeric > 50) {
      console.log('✅ London Pricing Analysis Report');
      console.log('   - Average pricing by category');
      console.log('   - Price ranges and premium segments');
      console.log('   - Seasonal pricing patterns');
    }

    if (ratingStats._count.ratingNumeric > 50) {
      console.log('✅ London Quality & Ratings Report');
      console.log('   - Top-rated activities and providers');
      console.log('   - Rating distribution analysis');
      console.log('   - Quality vs price correlation');
    }

    if (categoryStats.length > 5) {
      console.log('✅ London Category Performance Report');
      console.log('   - Most popular activity categories');
      console.log('   - Category-specific pricing insights');
      console.log('   - Market gaps and opportunities');
    }

    if (providerStats.length > 10) {
      console.log('✅ London Provider Competitive Analysis');
      console.log('   - Market share by provider');
      console.log('   - Provider performance comparison');
      console.log('   - Competitive positioning insights');
    }

    if (platformStats.length > 1) {
      console.log('✅ London Platform Performance Report');
      console.log('   - Platform-specific pricing differences');
      console.log('   - Platform market share in London');
      console.log('   - Cross-platform provider analysis');
    }

    console.log('\n🎉 London data analysis completed!');

  } catch (error) {
    console.error('❌ Error analyzing London data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeLondonData().catch(console.error); 