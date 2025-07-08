import { mainPrisma } from '../lib/dual-prisma';

async function checkGYGImportStats() {
  console.log('📊 CHECKING IMPORTED GYG ACTIVITIES STATISTICS...\n');

  try {
    await mainPrisma.$connect();
    console.log('✅ Connected to main database');

    // Get total count
    const totalCount = await mainPrisma.importedGYGActivity.count();
    console.log(`📊 Total imported GYG activities: ${totalCount}`);

    // Get count by location
    const locationStats = await mainPrisma.importedGYGActivity.groupBy({
      by: ['location'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });

    console.log('\n📍 ACTIVITIES BY LOCATION:');
    locationStats.forEach(stat => {
      console.log(`   ${stat.location}: ${stat._count.id} activities`);
    });

    // Get count by provider
    const providerStats = await mainPrisma.importedGYGActivity.groupBy({
      by: ['providerName'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    console.log('\n🏢 TOP 10 PROVIDERS:');
    providerStats.forEach(stat => {
      console.log(`   ${stat.providerName}: ${stat._count.id} activities`);
    });

    // Get data quality statistics
    const qualityStats = await mainPrisma.importedGYGActivity.groupBy({
      by: ['extractionQuality'],
      _count: { id: true },
      _avg: { qualityScore: true }
    });

    console.log('\n📈 DATA QUALITY STATISTICS:');
    qualityStats.forEach(stat => {
      const avgScore = stat._avg.qualityScore ? stat._avg.qualityScore.toFixed(1) : 'N/A';
      console.log(`   ${stat.extractionQuality || 'Unknown'}: ${stat._count.id} activities (avg score: ${avgScore})`);
    });

    // Get price statistics
    const priceStats = await mainPrisma.importedGYGActivity.aggregate({
      _avg: { priceNumeric: true },
      _min: { priceNumeric: true },
      _max: { priceNumeric: true },
      _count: { priceNumeric: true }
    });

    console.log('\n💰 PRICE STATISTICS:');
    console.log(`   Average price: €${priceStats._avg.priceNumeric?.toFixed(2) || 'N/A'}`);
    console.log(`   Min price: €${priceStats._min.priceNumeric || 'N/A'}`);
    console.log(`   Max price: €${priceStats._max.priceNumeric || 'N/A'}`);
    console.log(`   Activities with prices: ${priceStats._count.priceNumeric}/${totalCount} (${((priceStats._count.priceNumeric / totalCount) * 100).toFixed(1)}%)`);

    // Get rating statistics
    const ratingStats = await mainPrisma.importedGYGActivity.aggregate({
      _avg: { ratingNumeric: true },
      _min: { ratingNumeric: true },
      _max: { ratingNumeric: true },
      _count: { ratingNumeric: true }
    });

    console.log('\n⭐ RATING STATISTICS:');
    console.log(`   Average rating: ${ratingStats._avg.ratingNumeric?.toFixed(2) || 'N/A'}/5.0`);
    console.log(`   Min rating: ${ratingStats._min.ratingNumeric || 'N/A'}/5.0`);
    console.log(`   Max rating: ${ratingStats._max.ratingNumeric || 'N/A'}/5.0`);
    console.log(`   Activities with ratings: ${ratingStats._count.ratingNumeric}/${totalCount} (${((ratingStats._count.ratingNumeric / totalCount) * 100).toFixed(1)}%)`);

    // Get review count statistics
    const reviewStats = await mainPrisma.importedGYGActivity.aggregate({
      _avg: { reviewCountNumeric: true },
      _max: { reviewCountNumeric: true },
      _count: { reviewCountNumeric: true }
    });

    console.log('\n📝 REVIEW COUNT STATISTICS:');
    console.log(`   Average reviews: ${reviewStats._avg.reviewCountNumeric?.toFixed(0) || 'N/A'}`);
    console.log(`   Max reviews: ${reviewStats._max.reviewCountNumeric || 'N/A'}`);
    console.log(`   Activities with reviews: ${reviewStats._count.reviewCountNumeric}/${totalCount} (${((reviewStats._count.reviewCountNumeric / totalCount) * 100).toFixed(1)}%)`);

    // Get Madrid vs other activities
    const madridCount = await mainPrisma.importedGYGActivity.count({
      where: {
        location: {
          contains: 'Madrid'
        }
      }
    });

    const otherCount = totalCount - madridCount;

    console.log('\n🌍 LOCATION BREAKDOWN:');
    console.log(`   Madrid activities: ${madridCount} (${((madridCount / totalCount) * 100).toFixed(1)}%)`);
    console.log(`   Other locations: ${otherCount} (${((otherCount / totalCount) * 100).toFixed(1)}%)`);

    // Get recent imports
    const recentImports = await mainPrisma.importedGYGActivity.findMany({
      orderBy: { importedAt: 'desc' },
      take: 5,
      select: {
        activityName: true,
        location: true,
        providerName: true,
        importedAt: true
      }
    });

    console.log('\n📅 RECENT IMPORTS:');
    recentImports.forEach((activity, index) => {
      const timeAgo = getTimeAgo(activity.importedAt);
      console.log(`   ${index + 1}. ${activity.activityName}`);
      console.log(`      Location: ${activity.location} | Provider: ${activity.providerName}`);
      console.log(`      Imported: ${timeAgo}`);
    });

    console.log('\n✅ GYG Import Statistics Check Completed!');

  } catch (error) {
    console.error('❌ Error checking GYG import stats:', error);
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
checkGYGImportStats().catch(console.error); 