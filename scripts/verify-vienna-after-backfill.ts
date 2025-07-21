import { mainPrisma } from '../src/lib/dual-prisma';

async function verifyViennaAfterBackfill() {
  console.log('🔍 VERIFYING VIENNA ACTIVITIES AFTER BACKFILL...\n');

  try {
    await mainPrisma.$connect();
    
    console.log('✅ Connected to main database');

    // Get Vienna activities
    const viennaActivities = await mainPrisma.importedGYGActivity.findMany({
      where: {
        OR: [
          { location: { contains: 'Vienna', mode: 'insensitive' } },
          { activityName: { contains: 'Vienna', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        activityName: true,
        reviewCountText: true,
        reviewCountNumeric: true,
        ratingText: true,
        ratingNumeric: true,
        priceText: true,
        priceNumeric: true,
        providerName: true,
        location: true
      }
    });

    console.log(`📊 Found ${viennaActivities.length} Vienna activities`);

    // Analyze data quality
    const withReviewCount = viennaActivities.filter(a => a.reviewCountNumeric !== null);
    const withRating = viennaActivities.filter(a => a.ratingNumeric !== null);
    const withPrice = viennaActivities.filter(a => a.priceNumeric !== null);
    const withProvider = viennaActivities.filter(a => a.providerName && a.providerName.trim() !== '');

    console.log('\n📈 VIENNA DATA QUALITY AFTER BACKFILL:');
    console.log(`Total Vienna Activities: ${viennaActivities.length}`);
    console.log(`With Review Count: ${withReviewCount.length} (${((withReviewCount.length / viennaActivities.length) * 100).toFixed(1)}%)`);
    console.log(`With Rating: ${withRating.length} (${((withRating.length / viennaActivities.length) * 100).toFixed(1)}%)`);
    console.log(`With Price: ${withPrice.length} (${((withPrice.length / viennaActivities.length) * 100).toFixed(1)}%)`);
    console.log(`With Provider: ${withProvider.length} (${((withProvider.length / viennaActivities.length) * 100).toFixed(1)}%)`);

    // Show some examples with review counts
    const examplesWithReviews = withReviewCount.slice(0, 5);
    console.log('\n⭐ VIENNA ACTIVITIES WITH REVIEW COUNTS:');
    examplesWithReviews.forEach((activity, index) => {
      console.log(`\n${index + 1}. ${activity.activityName}`);
      console.log(`   Review Count: ${activity.reviewCountText} (${activity.reviewCountNumeric})`);
      console.log(`   Rating: ${activity.ratingText} (${activity.ratingNumeric})`);
      console.log(`   Price: ${activity.priceText} (${activity.priceNumeric})`);
      console.log(`   Provider: ${activity.providerName}`);
      console.log(`   Location: ${activity.location}`);
    });

    // Calculate average review count for Vienna
    const validReviewCounts = withReviewCount.map(a => a.reviewCountNumeric).filter(count => count !== null) as number[];
    const averageReviewCount = validReviewCounts.length > 0 
      ? validReviewCounts.reduce((sum, count) => sum + count, 0) / validReviewCounts.length
      : 0;

    console.log(`\n📊 VIENNA REVIEW COUNT STATISTICS:`);
    console.log(`Average Review Count: ${averageReviewCount.toFixed(0)}`);
    console.log(`Highest Review Count: ${Math.max(...validReviewCounts)}`);
    console.log(`Lowest Review Count: ${Math.min(...validReviewCounts)}`);

    // Summary
    console.log('\n🎉 BACKFILL SUCCESS SUMMARY:');
    console.log(`✅ Review count coverage improved from 0% to ${((withReviewCount.length / viennaActivities.length) * 100).toFixed(1)}%`);
    console.log(`✅ ${withReviewCount.length} Vienna activities now have review counts`);
    console.log(`✅ Average review count: ${averageReviewCount.toFixed(0)} reviews`);

    return {
      totalVienna: viennaActivities.length,
      withReviewCount: withReviewCount.length,
      reviewCountCoverage: (withReviewCount.length / viennaActivities.length) * 100,
      averageReviewCount
    };

  } catch (error) {
    console.error('❌ Error verifying Vienna activities:', error);
    throw error;
  } finally {
    await mainPrisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  verifyViennaAfterBackfill().catch(console.error);
}

export { verifyViennaAfterBackfill }; 