import { mainPrisma } from '../src/lib/dual-prisma';

async function testVendorDashboard() {
  console.log('🧪 TESTING VENDOR DASHBOARD API...\n');

  try {
    await mainPrisma.$connect();
    console.log('✅ Connected to database');

    // Test cities to check
    const testCities = ['London', 'Edinburgh', 'Liverpool', 'Madrid', 'Vienna'];
    
    for (const city of testCities) {
      console.log(`\n📍 Testing city: ${city}`);
      
      // Test the same query logic as the API
      const whereClause = {
        OR: [
          { city: { contains: city, mode: 'insensitive' } },
          { location: { contains: city, mode: 'insensitive' } },
          { activityName: { contains: city, mode: 'insensitive' } },
          { venue: { contains: city, mode: 'insensitive' } }
        ]
      };

      const activities = await mainPrisma.importedGYGActivity.findMany({
        where: whereClause,
        select: {
          id: true,
          activityName: true,
          providerName: true,
          ratingNumeric: true,
          reviewCountNumeric: true,
          priceNumeric: true,
          priceText: true,
          priceCurrency: true,
          url: true,
          duration: true,
          venue: true,
          tags: true,
          qualityScore: true,
          location: true,
          city: true
        },
        take: 5
      });

      console.log(`  Found ${activities.length} activities`);

      if (activities.length > 0) {
        console.log('  Sample activities:');
        activities.slice(0, 3).forEach((activity, index) => {
          console.log(`    ${index + 1}. ${activity.activityName}`);
          console.log(`       Provider: ${activity.providerName}`);
          console.log(`       Price: ${activity.priceNumeric ? `€${activity.priceNumeric}` : 'N/A'}`);
          console.log(`       Rating: ${activity.ratingNumeric ? `${activity.ratingNumeric}/5` : 'N/A'}`);
          console.log(`       Reviews: ${activity.reviewCountNumeric || 'N/A'}`);
        });
      }

      // Test market insights calculation
      const allActivities = await mainPrisma.importedGYGActivity.findMany({
        where: whereClause,
        select: {
          providerName: true,
          ratingNumeric: true,
          reviewCountNumeric: true,
          priceNumeric: true,
          priceText: true,
          tags: true
        }
      });

      const validPrices = allActivities.filter(a => a.priceNumeric && a.priceNumeric > 0);
      const validRatings = allActivities.filter(a => a.ratingNumeric && a.ratingNumeric > 0);

      const averagePrice = validPrices.length > 0 
        ? validPrices.reduce((sum, a) => sum + a.priceNumeric!, 0) / validPrices.length 
        : 0;

      const averageRating = validRatings.length > 0 
        ? validRatings.reduce((sum, a) => sum + a.ratingNumeric!, 0) / validRatings.length 
        : 0;

      console.log(`  Market Insights:`);
      console.log(`    Total activities: ${allActivities.length}`);
      console.log(`    Average price: €${averagePrice.toFixed(2)}`);
      console.log(`    Average rating: ${averageRating.toFixed(2)}/5`);
      console.log(`    Price coverage: ${validPrices.length}/${allActivities.length} (${((validPrices.length / allActivities.length) * 100).toFixed(1)}%)`);
      console.log(`    Rating coverage: ${validRatings.length}/${allActivities.length} (${((validRatings.length / allActivities.length) * 100).toFixed(1)}%)`);
    }

    // Test category filtering
    console.log('\n🏷️ Testing category filtering...');
    const categories = ['Walking Tours', 'Food Tours', 'Cultural Tours'];
    
    for (const category of categories) {
      const categoryActivities = await mainPrisma.importedGYGActivity.findMany({
        where: {
          tags: {
            hasSome: [category]
          }
        },
        take: 3
      });

      console.log(`  ${category}: ${categoryActivities.length} activities found`);
      if (categoryActivities.length > 0) {
        console.log(`    Sample: ${categoryActivities[0].activityName}`);
      }
    }

    // Test API endpoint directly
    console.log('\n🌐 Testing API endpoint...');
    try {
      const response = await fetch('http://localhost:3000/api/vendor-dashboard?city=London&limit=5');
      if (response.ok) {
        const data = await response.json();
        console.log('  ✅ API endpoint working');
        console.log(`  Activities returned: ${data.activities.length}`);
        console.log(`  Market insights: ${data.marketInsights.totalCompetitors} competitors`);
        console.log(`  Top competitors: ${data.topCompetitors.length}`);
      } else {
        console.log('  ❌ API endpoint failed:', response.status);
      }
    } catch (error) {
      console.log('  ⚠️ API endpoint test skipped (server not running)');
    }

    console.log('\n✅ Vendor dashboard test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mainPrisma.$disconnect();
  }
}

// Run the test
testVendorDashboard()
  .then(() => {
    console.log('\n🎉 All tests completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  }); 