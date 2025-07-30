import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testProviderLinking() {
  try {
    console.log('🔍 Testing Provider Linking System');
    console.log('=====================================\n');

    // 1. Show available providers in our database
    console.log('📊 AVAILABLE PROVIDERS IN DATABASE:');
    console.log('-----------------------------------');
    
    const providers = await prisma.cleanedActivity.groupBy({
      by: ['providerName'],
      _count: { providerName: true },
      orderBy: { _count: { providerName: 'desc' } },
      take: 10
    });

    providers.forEach((provider, index) => {
      console.log(`${index + 1}. ${provider.providerName} (${provider._count.providerName} activities)`);
    });

    console.log('\n');

    // 2. Test provider search functionality
    console.log('🔎 TESTING PROVIDER SEARCH:');
    console.log('----------------------------');
    
    const searchTerm = 'London';
    const searchResults = await prisma.cleanedActivity.findMany({
      where: {
        providerName: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      },
      select: {
        providerName: true,
        activityName: true,
        priceNumeric: true,
        ratingNumeric: true,
        reviewCountNumeric: true,
        platform: true
      },
      take: 5
    });

    console.log(`Search results for "${searchTerm}":`);
    searchResults.forEach((activity, index) => {
      console.log(`${index + 1}. ${activity.providerName}`);
      console.log(`   Activity: ${activity.activityName}`);
      console.log(`   Price: £${activity.priceNumeric || 'N/A'}`);
      console.log(`   Rating: ${activity.ratingNumeric || 'N/A'}/5`);
      console.log(`   Platform: ${activity.platform}`);
      console.log('');
    });

    // 3. Test provider statistics calculation
    console.log('📈 PROVIDER STATISTICS EXAMPLE:');
    console.log('--------------------------------');
    
    if (providers.length > 0) {
      const testProvider = providers[0].providerName;
      const providerActivities = await prisma.cleanedActivity.findMany({
        where: { providerName: testProvider },
        select: {
          priceNumeric: true,
          ratingNumeric: true,
          reviewCountNumeric: true,
          priceCurrency: true,
          region: true
        }
      });

      const prices = providerActivities.filter(a => a.priceNumeric && a.priceNumeric > 0);
      const ratings = providerActivities.filter(a => a.ratingNumeric && a.ratingNumeric > 0);
      const reviews = providerActivities.filter(a => a.reviewCountNumeric && a.reviewCountNumeric > 0);

      const averagePrice = prices.length > 0 ? 
        prices.reduce((sum, a) => sum + a.priceNumeric!, 0) / prices.length : 0;
      const averageRating = ratings.length > 0 ? 
        ratings.reduce((sum, a) => sum + a.ratingNumeric!, 0) / ratings.length : 0;
      const totalReviews = reviews.reduce((sum, a) => sum + a.reviewCountNumeric!, 0);

      console.log(`Provider: ${testProvider}`);
      console.log(`Total Activities: ${providerActivities.length}`);
      console.log(`Average Price: £${Math.round(averagePrice)}`);
      console.log(`Average Rating: ${Math.round(averageRating * 10) / 10}/5`);
      console.log(`Total Reviews: ${totalReviews}`);
      console.log(`Primary Currency: ${providerActivities[0]?.priceCurrency || '£'}`);
      console.log(`Primary Region: ${providerActivities[0]?.region || 'UK'}`);
    }

    console.log('\n');

    // 4. Show how linking would work
    console.log('🔗 PROVIDER LINKING PROCESS:');
    console.log('-----------------------------');
    console.log('1. User searches for provider name');
    console.log('2. System finds matching activities in cleaned database');
    console.log('3. System calculates aggregated statistics');
    console.log('4. System creates UserProduct record with provider link');
    console.log('5. InsightDeck now shows personalized data for that provider');
    console.log('6. All future market comparisons include user\'s linked activities');

    console.log('\n');

    // 5. Show current user products (if any)
    console.log('👤 CURRENT USER PRODUCTS:');
    console.log('-------------------------');
    
    const userProducts = await prisma.userProduct.findMany({
      where: { userId: 'demo-user' },
      select: {
        providerName: true,
        linkedActivityCount: true,
        linkedAt: true,
        priceNumeric: true,
        ratingNumeric: true
      }
    });

    if (userProducts.length === 0) {
      console.log('No providers linked yet.');
      console.log('To link a provider, use the InsightDeck onboarding flow.');
    } else {
      userProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.providerName}`);
        console.log(`   Activities: ${product.linkedActivityCount}`);
        console.log(`   Avg Price: £${product.priceNumeric || 'N/A'}`);
        console.log(`   Avg Rating: ${product.ratingNumeric || 'N/A'}/5`);
        console.log(`   Linked: ${product.linkedAt?.toLocaleDateString()}`);
        console.log('');
      });
    }

    console.log('✅ Provider linking system test completed!');
    console.log('💡 Visit http://localhost:3001/insight-deck to test the UI');

  } catch (error) {
    console.error('❌ Error testing provider linking:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testProviderLinking()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }); 