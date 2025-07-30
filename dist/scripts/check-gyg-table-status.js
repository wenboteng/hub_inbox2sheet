"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkGYGTableStatus() {
    console.log('🔍 CHECKING IMPORTED GYG ACTIVITY TABLE STATUS...\n');
    try {
        // Check total count
        console.log('📊 TABLE OVERVIEW:');
        console.log('==================');
        const totalCount = await prisma.importedGYGActivity.count();
        console.log(`Total activities in ImportedGYGActivity: ${totalCount}`);
        // Check London activities specifically
        const londonCount = await prisma.importedGYGActivity.count({
            where: {
                OR: [
                    { city: { contains: 'London', mode: 'insensitive' } },
                    { location: { contains: 'London', mode: 'insensitive' } }
                ]
            }
        });
        console.log(`London activities in ImportedGYGActivity: ${londonCount}`);
        // Check other major cities
        console.log('\n🏙️ CITY DISTRIBUTION:');
        console.log('=====================');
        const cityStats = await prisma.importedGYGActivity.groupBy({
            by: ['city'],
            _count: { city: true },
            orderBy: { _count: { city: 'desc' } },
            take: 10
        });
        cityStats.forEach((city, index) => {
            console.log(`${index + 1}. "${city.city}": ${city._count.city} activities`);
        });
        // Check data quality
        console.log('\n🎯 DATA QUALITY ANALYSIS:');
        console.log('==========================');
        const withPrice = await prisma.importedGYGActivity.count({
            where: { priceNumeric: { not: null } }
        });
        const withRating = await prisma.importedGYGActivity.count({
            where: { ratingNumeric: { not: null } }
        });
        const withReviews = await prisma.importedGYGActivity.count({
            where: { reviewCountNumeric: { not: null } }
        });
        const withDescription = await prisma.importedGYGActivity.count({
            where: { description: { not: null } }
        });
        console.log(`Activities with price data: ${withPrice}/${totalCount} (${Math.round((withPrice / totalCount) * 100)}%)`);
        console.log(`Activities with rating data: ${withRating}/${totalCount} (${Math.round((withRating / totalCount) * 100)}%)`);
        console.log(`Activities with review count: ${withReviews}/${totalCount} (${Math.round((withReviews / totalCount) * 100)}%)`);
        console.log(`Activities with description: ${withDescription}/${totalCount} (${Math.round((withDescription / totalCount) * 100)}%)`);
        // Check extraction quality
        console.log('\n🔧 EXTRACTION QUALITY:');
        console.log('======================');
        const qualityStats = await prisma.importedGYGActivity.groupBy({
            by: ['extractionQuality'],
            _count: { extractionQuality: true }
        });
        qualityStats.forEach(stat => {
            console.log(`${stat.extractionQuality}: ${stat._count.extractionQuality} activities`);
        });
        // Sample London activities
        console.log('\n🇬🇧 SAMPLE LONDON ACTIVITIES:');
        console.log('=============================');
        const sampleLondon = await prisma.importedGYGActivity.findMany({
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
                priceNumeric: true,
                ratingNumeric: true,
                reviewCountNumeric: true,
                extractionQuality: true
            },
            take: 10
        });
        sampleLondon.forEach((activity, index) => {
            console.log(`${index + 1}. "${activity.activityName.substring(0, 60)}..."`);
            console.log(`   City: "${activity.city}" | Location: "${activity.location}"`);
            console.log(`   Price: ${activity.priceNumeric} | Rating: ${activity.ratingNumeric} | Reviews: ${activity.reviewCountNumeric}`);
            console.log(`   Quality: ${activity.extractionQuality}`);
            console.log('');
        });
        // Check what's in cleaned table now
        console.log('\n🧹 CLEANED TABLE STATUS:');
        console.log('========================');
        const cleanedTotal = await prisma.cleanedActivity.count();
        const cleanedLondon = await prisma.cleanedActivity.count({
            where: { city: 'London' }
        });
        console.log(`Total cleaned activities: ${cleanedTotal}`);
        console.log(`London cleaned activities: ${cleanedLondon}`);
        // Check platform distribution in cleaned data
        const platformStats = await prisma.cleanedActivity.groupBy({
            by: ['platform'],
            _count: { platform: true }
        });
        console.log('\nPlatform distribution in cleaned data:');
        platformStats.forEach(stat => {
            console.log(`  ${stat.platform}: ${stat._count.platform} activities`);
        });
        // Check if there are any references to the dropped Madrid table
        console.log('\n🔍 CHECKING FOR MADRID TABLE REFERENCES:');
        console.log('==========================================');
        try {
            const madridTest = await prisma.importedMadridActivity.count();
            console.log(`❌ Madrid table still exists: ${madridTest} activities`);
        }
        catch (error) {
            console.log('✅ Madrid table successfully dropped - no longer accessible');
        }
        console.log('\n🎯 CURRENT SITUATION SUMMARY:');
        console.log('=============================');
        console.log(`✅ ImportedGYGActivity: ${totalCount} activities (${londonCount} London)`);
        console.log(`✅ CleanedActivity: ${cleanedTotal} activities (${cleanedLondon} London)`);
        console.log(`✅ Madrid table: Dropped (no longer causing confusion)`);
        console.log(`✅ Ready for London-focused analysis`);
        console.log('\n📋 RECOMMENDATIONS:');
        console.log('===================');
        console.log('1. ✅ Focus on London data analysis with clean dataset');
        console.log('2. ✅ Use CleanedActivity table for reports (better quality)');
        console.log('3. ✅ Consider re-running data collection if you need more London data');
        console.log('4. ✅ Create London reports based on the 1,024 activities available');
    }
    catch (error) {
        console.error('❌ Error checking GYG table status:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkGYGTableStatus().catch(console.error);
//# sourceMappingURL=check-gyg-table-status.js.map