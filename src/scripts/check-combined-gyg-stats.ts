import { mainPrisma } from '../lib/dual-prisma';

async function checkCombinedGYGStats() {
  console.log('📊 CHECKING COMBINED GYG ACTIVITIES STATISTICS...\n');

  try {
    await mainPrisma.$connect();
    console.log('✅ Connected to main database');

    // Get counts for both tables
    const gygCount = await mainPrisma.importedGYGActivity.count();
    const madridCount = await mainPrisma.importedMadridActivity.count();
    const totalCount = gygCount + madridCount;

    console.log(`📊 TOTAL IMPORTED ACTIVITIES: ${totalCount}`);
    console.log(`   📍 Main GYG Activities: ${gygCount} (${((gygCount / totalCount) * 100).toFixed(1)}%)`);
    console.log(`   🏛️ Madrid Activities: ${madridCount} (${((madridCount / totalCount) * 100).toFixed(1)}%)`);

    // Main GYG Activities Statistics
    console.log('\n📈 MAIN GYG ACTIVITIES STATISTICS:');
    const gygStats = await mainPrisma.importedGYGActivity.aggregate({
      _avg: { 
        priceNumeric: true, 
        ratingNumeric: true, 
        reviewCountNumeric: true,
        qualityScore: true 
      },
      _count: { 
        priceNumeric: true, 
        ratingNumeric: true, 
        reviewCountNumeric: true 
      }
    });

    console.log(`   💰 Average price: €${gygStats._avg.priceNumeric?.toFixed(2) || 'N/A'}`);
    console.log(`   ⭐ Average rating: ${gygStats._avg.ratingNumeric?.toFixed(2) || 'N/A'}/5.0`);
    console.log(`   📝 Average reviews: ${gygStats._avg.reviewCountNumeric?.toFixed(0) || 'N/A'}`);
    console.log(`   📊 Average quality score: ${gygStats._avg.qualityScore?.toFixed(1) || 'N/A'}/100`);
    console.log(`   💰 Price coverage: ${((gygStats._count.priceNumeric / gygCount) * 100).toFixed(1)}%`);
    console.log(`   ⭐ Rating coverage: ${((gygStats._count.ratingNumeric / gygCount) * 100).toFixed(1)}%`);
    console.log(`   📝 Review coverage: ${((gygStats._count.reviewCountNumeric / gygCount) * 100).toFixed(1)}%`);

    // Madrid Activities Statistics
    console.log('\n🏛️ MADRID ACTIVITIES STATISTICS:');
    const madridStats = await mainPrisma.importedMadridActivity.aggregate({
      _avg: { 
        priceNumeric: true, 
        ratingNumeric: true, 
        reviewCountNumeric: true,
        qualityScore: true 
      },
      _count: { 
        priceNumeric: true, 
        ratingNumeric: true, 
        reviewCountNumeric: true 
      }
    });

    console.log(`   💰 Average price: €${madridStats._avg.priceNumeric?.toFixed(2) || 'N/A'}`);
    console.log(`   ⭐ Average rating: ${madridStats._avg.ratingNumeric?.toFixed(2) || 'N/A'}/5.0`);
    console.log(`   📝 Average reviews: ${madridStats._avg.reviewCountNumeric?.toFixed(0) || 'N/A'}`);
    console.log(`   📊 Average quality score: ${madridStats._avg.qualityScore?.toFixed(1) || 'N/A'}/100`);
    console.log(`   💰 Price coverage: ${((madridStats._count.priceNumeric / madridCount) * 100).toFixed(1)}%`);
    console.log(`   ⭐ Rating coverage: ${((madridStats._count.ratingNumeric / madridCount) * 100).toFixed(1)}%`);
    console.log(`   📝 Review coverage: ${((madridStats._count.reviewCountNumeric / madridCount) * 100).toFixed(1)}%`);

    // Location breakdown for main GYG activities
    console.log('\n📍 MAIN GYG ACTIVITIES BY LOCATION:');
    const locationStats = await mainPrisma.importedGYGActivity.groupBy({
      by: ['location'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    locationStats.forEach(stat => {
      console.log(`   ${stat.location}: ${stat._count.id} activities`);
    });

    // Quality comparison
    console.log('\n📊 DATA QUALITY COMPARISON:');
    console.log(`   Main GYG Activities: ${gygStats._avg.qualityScore?.toFixed(1) || 'N/A'}/100`);
    console.log(`   Madrid Activities: ${madridStats._avg.qualityScore?.toFixed(1) || 'N/A'}/100`);

    // Price comparison
    console.log('\n💰 PRICE COMPARISON:');
    console.log(`   Main GYG Activities: €${gygStats._avg.priceNumeric?.toFixed(2) || 'N/A'}`);
    console.log(`   Madrid Activities: €${madridStats._avg.priceNumeric?.toFixed(2) || 'N/A'}`);

    // Rating comparison
    console.log('\n⭐ RATING COMPARISON:');
    console.log(`   Main GYG Activities: ${gygStats._avg.ratingNumeric?.toFixed(2) || 'N/A'}/5.0`);
    console.log(`   Madrid Activities: ${madridStats._avg.ratingNumeric?.toFixed(2) || 'N/A'}/5.0`);

    // Recent imports
    console.log('\n📅 RECENT IMPORTS:');
    
    const recentGYG = await mainPrisma.importedGYGActivity.findMany({
      orderBy: { importedAt: 'desc' },
      take: 3,
      select: {
        activityName: true,
        location: true,
        importedAt: true
      }
    });

    const recentMadrid = await mainPrisma.importedMadridActivity.findMany({
      orderBy: { importedAt: 'desc' },
      take: 3,
      select: {
        activityName: true,
        importedAt: true
      }
    });

    console.log('   Main GYG Activities:');
    recentGYG.forEach((activity, index) => {
      const timeAgo = getTimeAgo(activity.importedAt);
      console.log(`     ${index + 1}. ${activity.activityName} (${activity.location}) - ${timeAgo}`);
    });

    console.log('   Madrid Activities:');
    recentMadrid.forEach((activity, index) => {
      const timeAgo = getTimeAgo(activity.importedAt);
      console.log(`     ${index + 1}. ${activity.activityName} - ${timeAgo}`);
    });

    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`✅ Total imported activities: ${totalCount}`);
    console.log(`✅ Main GYG activities: ${gygCount} (${((gygCount / totalCount) * 100).toFixed(1)}%)`);
    console.log(`✅ Madrid activities: ${madridCount} (${((madridCount / totalCount) * 100).toFixed(1)}%)`);
    console.log(`✅ Data is ready for analysis and market intelligence`);

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Run market analysis on combined dataset');
    console.log('2. Compare Madrid vs other locations');
    console.log('3. Generate competitive intelligence reports');
    console.log('4. Analyze provider performance across locations');

    console.log('\n✅ Combined GYG Statistics Check Completed!');

  } catch (error) {
    console.error('❌ Error checking combined GYG stats:', error);
  } finally {
    await mainPrisma.$disconnect();
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  
  if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

// Run the check
checkCombinedGYGStats().catch(console.error); 