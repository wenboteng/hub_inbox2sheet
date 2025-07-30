"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function showCleaningSummary() {
    try {
        console.log('📊 DATA CLEANING PIPELINE SUMMARY');
        console.log('=====================================\n');
        // Original data counts
        const originalGYG = await prisma.importedGYGActivity.count({
            where: {
                NOT: {
                    tags: {
                        has: 'viator'
                    }
                }
            }
        });
        const originalViator = await prisma.importedGYGActivity.count({
            where: {
                tags: {
                    has: 'viator'
                }
            }
        });
        console.log('📋 ORIGINAL DATA:');
        console.log(`  GYG Activities: ${originalGYG}`);
        console.log(`  Viator Activities: ${originalViator}`);
        console.log(`  Total: ${originalGYG + originalViator}\n`);
        // Cleaned data counts
        const cleanedTotal = await prisma.cleanedActivity.count();
        const cleanedGYG = await prisma.cleanedActivity.count({
            where: { platform: 'gyg' }
        });
        const cleanedViator = await prisma.cleanedActivity.count({
            where: { platform: 'viator' }
        });
        console.log('🧹 CLEANED DATA:');
        console.log(`  GYG Activities: ${cleanedGYG}`);
        console.log(`  Viator Activities: ${cleanedViator}`);
        console.log(`  Total: ${cleanedTotal}`);
        console.log(`  Success Rate: ${Math.round((cleanedTotal / (originalGYG + originalViator)) * 100)}%\n`);
        // Quality distribution
        const qualityStats = await prisma.cleanedActivity.groupBy({
            by: ['qualityScore'],
            _count: { qualityScore: true },
            orderBy: { qualityScore: 'desc' }
        });
        console.log('🎯 QUALITY DISTRIBUTION:');
        qualityStats.forEach(stat => {
            const percentage = Math.round((stat._count.qualityScore / cleanedTotal) * 100);
            console.log(`  ${stat.qualityScore}%: ${stat._count.qualityScore} activities (${percentage}%)`);
        });
        console.log();
        // Currency distribution
        const currencyStats = await prisma.cleanedActivity.groupBy({
            by: ['priceCurrency'],
            _count: { priceCurrency: true }
        });
        console.log('💰 CURRENCY DISTRIBUTION:');
        currencyStats.forEach(stat => {
            const percentage = Math.round((stat._count.priceCurrency / cleanedTotal) * 100);
            console.log(`  ${stat.priceCurrency}: ${stat._count.priceCurrency} activities (${percentage}%)`);
        });
        console.log();
        // Region distribution
        const regionStats = await prisma.cleanedActivity.groupBy({
            by: ['region'],
            _count: { region: true }
        });
        console.log('🌍 REGION DISTRIBUTION:');
        regionStats.forEach(stat => {
            const percentage = Math.round((stat._count.region / cleanedTotal) * 100);
            console.log(`  ${stat.region}: ${stat._count.region} activities (${percentage}%)`);
        });
        console.log();
        // Top cities
        const topCities = await prisma.cleanedActivity.groupBy({
            by: ['city'],
            _count: { city: true },
            orderBy: { _count: { city: 'desc' } },
            take: 10
        });
        console.log('🏙️  TOP 10 CITIES:');
        topCities.forEach((stat, index) => {
            console.log(`  ${index + 1}. ${stat.city}: ${stat._count.city} activities`);
        });
        console.log();
        // Top providers
        const topProviders = await prisma.cleanedActivity.groupBy({
            by: ['providerName'],
            _count: { providerName: true },
            orderBy: { _count: { providerName: 'desc' } },
            take: 10
        });
        console.log('🏢 TOP 10 PROVIDERS:');
        topProviders.forEach((stat, index) => {
            console.log(`  ${index + 1}. ${stat.providerName}: ${stat._count.providerName} activities`);
        });
        console.log();
        // Price statistics
        const priceStats = await prisma.cleanedActivity.aggregate({
            where: {
                priceNumeric: {
                    not: null
                }
            },
            _avg: { priceNumeric: true },
            _min: { priceNumeric: true },
            _max: { priceNumeric: true },
            _count: { priceNumeric: true }
        });
        console.log('💵 PRICE STATISTICS:');
        console.log(`  Average Price: £${Math.round((priceStats._avg.priceNumeric || 0) * 100) / 100}`);
        console.log(`  Min Price: £${priceStats._min.priceNumeric || 0}`);
        console.log(`  Max Price: £${priceStats._max.priceNumeric || 0}`);
        console.log(`  Activities with Prices: ${priceStats._count.priceNumeric}/${cleanedTotal}`);
        console.log();
        // Rating statistics
        const ratingStats = await prisma.cleanedActivity.aggregate({
            where: {
                ratingNumeric: {
                    not: null
                }
            },
            _avg: { ratingNumeric: true },
            _min: { ratingNumeric: true },
            _max: { ratingNumeric: true },
            _count: { ratingNumeric: true }
        });
        console.log('⭐ RATING STATISTICS:');
        console.log(`  Average Rating: ${Math.round((ratingStats._avg.ratingNumeric || 0) * 10) / 10}/5`);
        console.log(`  Min Rating: ${ratingStats._min.ratingNumeric || 0}/5`);
        console.log(`  Max Rating: ${ratingStats._max.ratingNumeric || 0}/5`);
        console.log(`  Activities with Ratings: ${ratingStats._count.ratingNumeric}/${cleanedTotal}`);
        console.log();
        // Recent cleaning activity
        const recentCleaning = await prisma.cleanedActivity.findFirst({
            orderBy: { cleanedAt: 'desc' },
            select: { cleanedAt: true }
        });
        console.log('🕒 CLEANING TIMESTAMP:');
        console.log(`  Last Activity Cleaned: ${recentCleaning?.cleanedAt.toISOString()}`);
        console.log();
        console.log('✅ DATA CLEANING PIPELINE COMPLETED SUCCESSFULLY!');
        console.log('🎯 InsightDeck now uses high-quality, cleaned data with local currency support.');
    }
    catch (error) {
        console.error('❌ Error generating summary:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the summary
showCleaningSummary()
    .then(() => {
    console.log('✅ Summary completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Summary failed:', error);
    process.exit(1);
});
//# sourceMappingURL=data-cleaning-summary.js.map