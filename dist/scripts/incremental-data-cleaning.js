"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementalDataCleaning = incrementalDataCleaning;
const dual_prisma_1 = require("../lib/dual-prisma");
const data_cleaning_pipeline_1 = require("./data-cleaning-pipeline");
const slugify_1 = require("../utils/slugify");
async function incrementalDataCleaning() {
    console.log('🔄 INCREMENTAL GYG DATA CLEANING...\n');
    try {
        await dual_prisma_1.gygPrisma.$connect();
        await dual_prisma_1.mainPrisma.$connect();
        console.log('✅ Connected to both databases');
        // Get the latest cleaning timestamp from main database
        const latestCleaning = await dual_prisma_1.mainPrisma.importedGYGActivity.findFirst({
            orderBy: { cleanedAt: 'desc' },
            select: { cleanedAt: true }
        });
        const lastCleaningTime = latestCleaning?.cleanedAt || new Date(0);
        console.log(`📅 Last cleaning time: ${lastCleaningTime.toISOString()}`);
        // Get new/updated activities from GYG database
        const newActivities = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT * FROM activities 
      WHERE created_at > ${lastCleaningTime}
         OR updated_at > ${lastCleaningTime}
      ORDER BY created_at DESC
    `;
        const newCount = newActivities.length;
        console.log(`📊 Found ${newCount} new/updated activities to clean`);
        if (newCount === 0) {
            console.log('✅ No new data to clean');
            return;
        }
        let processedCount = 0;
        let errorCount = 0;
        let updatedCount = 0;
        let createdCount = 0;
        for (const activity of newActivities) {
            try {
                // Clean all fields
                const cleanedPrice = (0, data_cleaning_pipeline_1.cleanPrice)(activity.price);
                const cleanedRating = (0, data_cleaning_pipeline_1.cleanRating)(activity.rating);
                const cleanedLocation = (0, data_cleaning_pipeline_1.cleanLocation)(activity.location);
                const cleanedDuration = (0, data_cleaning_pipeline_1.cleanDuration)(activity.duration);
                const cleanedProvider = (0, data_cleaning_pipeline_1.cleanProviderName)(activity.provider_name);
                const cleanedTags = (0, data_cleaning_pipeline_1.cleanTags)(activity.tags);
                const qualityScore = (0, data_cleaning_pipeline_1.calculateQualityScore)(activity);
                // Check if activity already exists in main database
                const existing = await dual_prisma_1.mainPrisma.importedGYGActivity.findFirst({
                    where: { originalId: activity.id.toString() }
                });
                const data = {
                    originalId: activity.id.toString(),
                    activityName: activity.activity_name?.trim() || '',
                    providerName: cleanedProvider,
                    location: cleanedLocation.city,
                    priceText: cleanedPrice.original,
                    priceNumeric: cleanedPrice.numeric,
                    ratingText: cleanedRating.original,
                    ratingNumeric: cleanedRating.rating,
                    reviewCountText: cleanedRating.original,
                    reviewCountNumeric: cleanedRating.reviews,
                    duration: cleanedDuration.original,
                    description: activity.description?.trim() || '',
                    extractionQuality: activity.extraction_quality || 'Unknown',
                    tags: cleanedTags,
                    url: activity.url || activity.activity_url || '',
                    cleanedAt: new Date(),
                    qualityScore,
                    city: cleanedLocation.city,
                    country: cleanedLocation.country,
                    venue: cleanedLocation.venue,
                    priceCurrency: cleanedPrice.currency,
                    durationHours: cleanedDuration.hours,
                    durationDays: cleanedDuration.days
                };
                if (existing) {
                    // Update existing record
                    await dual_prisma_1.mainPrisma.importedGYGActivity.update({
                        where: { id: existing.id },
                        data: { ...data, updatedAt: new Date() }
                    });
                    updatedCount++;
                    console.log(`🔄 Updated: ${activity.activity_name}`);
                }
                else {
                    // Create new record
                    await dual_prisma_1.mainPrisma.importedGYGActivity.create({ data });
                    createdCount++;
                    console.log(`➕ Created: ${activity.activity_name}`);
                }
                processedCount++;
            }
            catch (error) {
                console.error(`Error processing activity ${activity.id}:`, error);
                errorCount++;
            }
        }
        console.log(`\n📊 INCREMENTAL CLEANING SUMMARY:`);
        console.log(`✅ Successfully processed: ${processedCount} activities`);
        console.log(`➕ New records created: ${createdCount}`);
        console.log(`🔄 Existing records updated: ${updatedCount}`);
        console.log(`❌ Errors: ${errorCount} activities`);
        console.log(`📈 Success rate: ${((processedCount / newCount) * 100).toFixed(1)}%`);
        // Generate incremental report
        const report = `
# GYG Incremental Data Cleaning Report

## Summary
- **New Activities Found**: ${newCount}
- **Successfully Processed**: ${processedCount}
- **New Records Created**: ${createdCount}
- **Existing Records Updated**: ${updatedCount}
- **Errors**: ${errorCount}
- **Success Rate**: ${((processedCount / newCount) * 100).toFixed(1)}%

## Processing Details
- **Last Cleaning Time**: ${lastCleaningTime.toISOString()}
- **Processing Date**: ${new Date().toISOString()}
- **Pipeline Type**: Incremental

## Data Quality
All new data is automatically cleaned using standardized functions:
- ✅ Price extraction and currency detection
- ✅ Rating and review count parsing
- ✅ Location standardization
- ✅ Duration normalization
- ✅ Provider name cleaning
- ✅ Tags processing
- ✅ Quality scoring

## Benefits
1. **Efficient**: Only processes new/updated data
2. **Consistent**: Same cleaning rules for all data
3. **Traceable**: Maintains original and cleaned values
4. **Scalable**: Handles growing datasets
5. **Future-ready**: Works with any platform

## Next Steps
1. **Monitor**: Track cleaning success rates
2. **Analyze**: Use cleaned data for insights
3. **Automate**: Schedule regular incremental cleaning
4. **Expand**: Apply to new platforms (Viator, Airbnb, etc.)

This incremental cleaning ensures your data pipeline remains efficient and consistent as your dataset grows.
`;
        // Save incremental report
        await dual_prisma_1.mainPrisma.report.upsert({
            where: { type: 'gyg-incremental-cleaning-report' },
            create: {
                type: 'gyg-incremental-cleaning-report',
                title: 'GYG Incremental Data Cleaning Report',
                slug: (0, slugify_1.slugify)('GYG Incremental Data Cleaning Report'),
                content: report,
                isPublic: false,
            },
            update: {
                title: 'GYG Incremental Data Cleaning Report',
                slug: (0, slugify_1.slugify)('GYG Incremental Data Cleaning Report'),
                content: report,
                isPublic: false,
            },
        });
        console.log('✅ Incremental cleaning report saved');
        console.log('\n🎉 INCREMENTAL DATA CLEANING COMPLETED!');
    }
    catch (error) {
        console.error('❌ Error during incremental cleaning:', error);
    }
    finally {
        await dual_prisma_1.gygPrisma.$disconnect();
        await dual_prisma_1.mainPrisma.$disconnect();
    }
}
// Run the script
if (require.main === module) {
    incrementalDataCleaning().catch(console.error);
}
//# sourceMappingURL=incremental-data-cleaning.js.map