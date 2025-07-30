"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function testProviderAPI() {
    try {
        console.log('🔗 Testing Provider Linking API');
        console.log('================================\n');
        // Test 1: Link a provider
        console.log('1️⃣ LINKING PROVIDER: Evan Evans Tours');
        console.log('--------------------------------------');
        const providerName = 'Evan Evans Tours';
        const userId = 'demo-user';
        // Check if provider exists in our database
        const providerActivities = await prisma.cleanedActivity.findMany({
            where: {
                providerName: {
                    contains: providerName,
                    mode: 'insensitive'
                }
            },
            select: {
                id: true,
                activityName: true,
                providerName: true,
                location: true,
                city: true,
                country: true,
                region: true,
                priceNumeric: true,
                priceCurrency: true,
                priceText: true,
                ratingNumeric: true,
                ratingText: true,
                reviewCountNumeric: true,
                reviewCountText: true,
                category: true,
                activityType: true,
                duration: true,
                durationHours: true,
                durationDays: true,
                description: true,
                venue: true,
                platform: true,
                url: true
            }
        });
        console.log(`Found ${providerActivities.length} activities for "${providerName}"`);
        if (providerActivities.length === 0) {
            console.log('❌ Provider not found in database');
            return;
        }
        // Check if already linked
        const existingLink = await prisma.userProduct.findFirst({
            where: {
                userId,
                providerName: {
                    contains: providerName,
                    mode: 'insensitive'
                },
                isActive: true
            }
        });
        if (existingLink) {
            console.log('⚠️  Provider already linked');
            console.log(`   Provider: ${existingLink.providerName}`);
            console.log(`   Activities: ${existingLink.linkedActivityCount}`);
            console.log(`   Linked: ${existingLink.linkedAt?.toLocaleDateString()}`);
        }
        else {
            // Calculate statistics
            const prices = providerActivities.filter(a => a.priceNumeric && a.priceNumeric > 0);
            const ratings = providerActivities.filter(a => a.ratingNumeric && a.ratingNumeric > 0);
            const reviews = providerActivities.filter(a => a.reviewCountNumeric && a.reviewCountNumeric > 0);
            const averagePrice = prices.length > 0 ?
                prices.reduce((sum, a) => sum + a.priceNumeric, 0) / prices.length : 0;
            const averageRating = ratings.length > 0 ?
                ratings.reduce((sum, a) => sum + a.ratingNumeric, 0) / ratings.length : 0;
            const totalReviews = reviews.reduce((sum, a) => sum + a.reviewCountNumeric, 0);
            // Currency distribution
            const currencyCounts = {};
            providerActivities.forEach(a => {
                if (a.priceCurrency) {
                    currencyCounts[a.priceCurrency] = (currencyCounts[a.priceCurrency] || 0) + 1;
                }
            });
            const primaryCurrency = Object.keys(currencyCounts).sort((a, b) => currencyCounts[b] - currencyCounts[a])[0] || '£';
            // Region distribution
            const regionCounts = {};
            providerActivities.forEach(a => {
                if (a.region) {
                    regionCounts[a.region] = (regionCounts[a.region] || 0) + 1;
                }
            });
            const primaryRegion = Object.keys(regionCounts).sort((a, b) => regionCounts[b] - regionCounts[a])[0] || 'UK';
            // Create provider link
            const userProvider = await prisma.userProduct.create({
                data: {
                    userId,
                    providerName: providerActivities[0].providerName,
                    location: 'Multiple Locations',
                    city: 'Multiple Cities',
                    country: 'Multiple Countries',
                    region: primaryRegion,
                    priceNumeric: averagePrice,
                    priceCurrency: primaryCurrency,
                    priceText: `${primaryCurrency}${Math.round(averagePrice)}`,
                    ratingNumeric: averageRating,
                    ratingText: `${Math.round(averageRating * 10) / 10}`,
                    reviewCountNumeric: totalReviews,
                    reviewCountText: `${totalReviews} total reviews`,
                    category: 'multiple',
                    activityType: 'multiple',
                    duration: 'Variable',
                    durationHours: null,
                    durationDays: null,
                    description: `Linked provider with ${providerActivities.length} activities`,
                    venue: 'Multiple Venues',
                    platform: 'multiple',
                    url: null,
                    linkedActivityCount: providerActivities.length,
                    linkedAt: new Date()
                }
            });
            console.log('✅ Provider linked successfully!');
            console.log(`   Provider: ${userProvider.providerName}`);
            console.log(`   Activities: ${userProvider.linkedActivityCount}`);
            console.log(`   Average Price: ${userProvider.priceCurrency}${Math.round(userProvider.priceNumeric || 0)}`);
            console.log(`   Average Rating: ${userProvider.ratingNumeric}/5`);
            console.log(`   Total Reviews: ${userProvider.reviewCountNumeric}`);
            console.log(`   Primary Region: ${userProvider.region}`);
        }
        console.log('\n');
        // Test 2: Fetch linked providers
        console.log('2️⃣ FETCHING LINKED PROVIDERS');
        console.log('-----------------------------');
        const userProviders = await prisma.userProduct.findMany({
            where: {
                userId: 'demo-user',
                isActive: true
            },
            select: {
                id: true,
                providerName: true,
                linkedAt: true,
                linkedActivityCount: true,
                priceNumeric: true,
                priceCurrency: true,
                ratingNumeric: true,
                reviewCountNumeric: true,
                region: true
            },
            orderBy: { linkedAt: 'desc' }
        });
        if (userProviders.length === 0) {
            console.log('No providers linked yet.');
        }
        else {
            userProviders.forEach((provider, index) => {
                console.log(`${index + 1}. ${provider.providerName}`);
                console.log(`   Activities: ${provider.linkedActivityCount}`);
                console.log(`   Avg Price: ${provider.priceCurrency}${Math.round(provider.priceNumeric || 0)}`);
                console.log(`   Avg Rating: ${provider.ratingNumeric}/5`);
                console.log(`   Total Reviews: ${provider.reviewCountNumeric}`);
                console.log(`   Region: ${provider.region}`);
                console.log(`   Linked: ${provider.linkedAt?.toLocaleDateString()}`);
                console.log('');
            });
        }
        console.log('\n');
        // Test 3: Show how InsightDeck would use this data
        console.log('3️⃣ INSIGHTDECK INTEGRATION');
        console.log('---------------------------');
        if (userProviders.length > 0) {
            const userProvider = userProviders[0];
            // Get market data for comparison
            const marketActivities = await prisma.cleanedActivity.findMany({
                where: { region: userProvider.region },
                select: {
                    priceNumeric: true,
                    ratingNumeric: true,
                    reviewCountNumeric: true
                },
                take: 100
            });
            const marketPrices = marketActivities.filter(a => a.priceNumeric && a.priceNumeric > 0).map(a => a.priceNumeric);
            const marketRatings = marketActivities.filter(a => a.ratingNumeric && a.ratingNumeric > 0).map(a => a.ratingNumeric);
            const marketAvgPrice = marketPrices.length > 0 ?
                marketPrices.reduce((sum, price) => sum + price, 0) / marketPrices.length : 0;
            const marketAvgRating = marketRatings.length > 0 ?
                marketRatings.reduce((sum, rating) => sum + rating, 0) / marketRatings.length : 0;
            const userPrice = userProvider.priceNumeric || 0;
            const userRating = userProvider.ratingNumeric || 0;
            console.log('📊 MARKET COMPARISON:');
            console.log(`   Your Provider: ${userProvider.providerName}`);
            console.log(`   Your Avg Price: ${userProvider.priceCurrency}${Math.round(userPrice)}`);
            console.log(`   Market Avg Price: ${userProvider.priceCurrency}${Math.round(marketAvgPrice)}`);
            console.log(`   Price Difference: ${userPrice > marketAvgPrice ? '+' : ''}${Math.round(((userPrice - marketAvgPrice) / marketAvgPrice) * 100)}%`);
            console.log(`   Your Avg Rating: ${userRating}/5`);
            console.log(`   Market Avg Rating: ${Math.round(marketAvgRating * 10) / 10}/5`);
            console.log(`   Rating Difference: ${userRating > marketAvgRating ? '+' : ''}${Math.round(((userRating - marketAvgRating) / marketAvgRating) * 100)}%`);
            // Generate insights
            console.log('\n🎯 INSIGHTS:');
            if (userPrice > marketAvgPrice * 1.2) {
                console.log('   ⚠️  Your prices are 20%+ above market average');
            }
            else if (userPrice < marketAvgPrice * 0.8) {
                console.log('   💡 Your prices are 20%+ below market average (opportunity to increase)');
            }
            else {
                console.log('   ✅ Your pricing is competitive with the market');
            }
            if (userRating > marketAvgRating + 0.5) {
                console.log('   🌟 Your ratings are significantly above market average');
            }
            else if (userRating < marketAvgRating - 0.5) {
                console.log('   ⚠️  Your ratings are below market average');
            }
            else {
                console.log('   ✅ Your ratings are in line with the market');
            }
        }
        console.log('\n✅ Provider linking API test completed!');
        console.log('💡 Now visit http://localhost:3001/insight-deck to see the UI in action');
    }
    catch (error) {
        console.error('❌ Error testing provider API:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the test
testProviderAPI()
    .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
//# sourceMappingURL=test-provider-api.js.map