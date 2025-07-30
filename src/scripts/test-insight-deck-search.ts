import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSearchFunctionality() {
  console.log('🔍 Testing InsightDeck Search Functionality');
  console.log('==========================================\n');

  // Test 1: Check if providers exist in cleaned_activities
  console.log('📊 Test 1: Checking available providers in cleaned_activities...');
  
  const providers = await prisma.cleanedActivity.groupBy({
    by: ['providerName'],
    _count: { providerName: true },
    orderBy: { _count: { providerName: 'desc' } },
    take: 10
  });

  console.log('Top 10 providers in database:');
  providers.forEach((provider, index) => {
    console.log(`${index + 1}. ${provider.providerName} (${provider._count.providerName} activities)`);
  });

  // Test 2: Test search functionality
  console.log('\n🔎 Test 2: Testing search functionality...');
  
  const searchTerms = ['Evan', 'Premium', 'London', 'Tours'];
  
  for (const term of searchTerms) {
    console.log(`\nSearching for "${term}":`);
    
    const searchResults = await prisma.cleanedActivity.findMany({
      where: {
        providerName: {
          contains: term,
          mode: 'insensitive'
        }
      },
      select: {
        providerName: true,
        activityName: true,
        priceNumeric: true,
        ratingNumeric: true,
        platform: true
      },
      take: 5
    });

    if (searchResults.length > 0) {
      console.log(`✅ Found ${searchResults.length} results`);
      const uniqueProviders = [...new Set(searchResults.map(r => r.providerName))];
      console.log(`   Providers: ${uniqueProviders.join(', ')}`);
    } else {
      console.log(`❌ No results found`);
    }
  }

  // Test 3: Check user products
  console.log('\n👤 Test 3: Checking user products...');
  
  const userProducts = await prisma.userProduct.findMany({
    where: { userId: 'demo-user' },
    include: {
      user: true
    }
  });

  console.log(`Found ${userProducts.length} linked providers for demo user:`);
  userProducts.forEach(product => {
    console.log(`   - ${product.providerName} (linked: ${product.linkedAt})`);
  });

  // Test 4: Test the API endpoint directly
  console.log('\n🌐 Test 4: Testing API endpoint...');
  
  try {
    const response = await fetch('http://localhost:3002/api/market/activities?search=Evan&limit=5');
    const data = await response.json();
    
    if (data.activities && data.activities.length > 0) {
      console.log(`✅ API returned ${data.activities.length} activities`);
      console.log(`   Summary: ${data.summary.totalActivities} total activities`);
      console.log(`   Average price: £${data.summary.averagePrice}`);
      console.log(`   Average rating: ${data.summary.averageRating}/5`);
    } else {
      console.log('❌ API returned no results');
    }
  } catch (error) {
    console.log('❌ API test failed:', error);
  }

  console.log('\n🎯 Search Functionality Test Complete!');
  console.log('\n💡 If you\'re having issues with the frontend search:');
  console.log('   1. Make sure you\'re typing the provider name correctly');
  console.log('   2. Try searching for partial names (e.g., "Evan" instead of "Evan Evans Tours")');
  console.log('   3. Check the browser console for any JavaScript errors');
  console.log('   4. Try refreshing the page and searching again');
}

async function main() {
  try {
    await testSearchFunctionality();
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 