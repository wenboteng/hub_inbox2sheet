"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fullGYGImport = fullGYGImport;
const dual_prisma_1 = require("../lib/dual-prisma");
async function fullGYGImport() {
    console.log('🚀 FULL GYG DATA IMPORT TO MAIN DATABASE...\n');
    try {
        await dual_prisma_1.gygPrisma.$connect();
        await dual_prisma_1.mainPrisma.$connect();
        console.log('✅ Connected to both databases');
        // Get total count from GYG
        const totalCount = await dual_prisma_1.gygPrisma.$queryRaw `SELECT COUNT(*) as count FROM activities`;
        const totalRecords = Number(totalCount[0]?.count || 0);
        console.log(`📊 Found ${totalRecords} activities in GYG database`);
        // Check existing imports
        const existingCount = await dual_prisma_1.mainPrisma.importedGYGActivity.count();
        if (existingCount > 0) {
            console.log(`⚠️  Found ${existingCount} existing imported records`);
            console.log('💡 Clearing existing imports for fresh data...');
            await dual_prisma_1.mainPrisma.importedGYGActivity.deleteMany();
        }
        // Process in batches
        const batchSize = 50;
        let processedCount = 0;
        let errorCount = 0;
        console.log(`\n📦 PROCESSING ${totalRecords} ACTIVITIES IN BATCHES OF ${batchSize}...`);
        for (let offset = 0; offset < totalRecords; offset += batchSize) {
            try {
                const batchNumber = Math.floor(offset / batchSize) + 1;
                const totalBatches = Math.ceil(totalRecords / batchSize);
                console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches}`);
                const batch = await dual_prisma_1.gygPrisma.$queryRaw `
          SELECT * FROM activities 
          ORDER BY id 
          LIMIT ${batchSize} OFFSET ${offset}
        `;
                for (const activity of batch) {
                    try {
                        if (activity.id && activity.activity_name && activity.provider_name && activity.location) {
                            // Parse data
                            const priceNumeric = parsePriceFromText(activity.price);
                            const ratingNumeric = parseRatingFromText(activity.rating);
                            const reviewCountNumeric = parseReviewCountFromText(activity.review_count);
                            const tags = parseTagsFromJSONB(activity.tags);
                            // Import to main database
                            await dual_prisma_1.mainPrisma.importedGYGActivity.create({
                                data: {
                                    originalId: activity.id.toString(),
                                    activityName: activity.activity_name.trim(),
                                    providerName: activity.provider_name.trim(),
                                    location: activity.location.trim(),
                                    priceText: activity.price?.trim() || null,
                                    priceNumeric,
                                    ratingText: activity.rating?.trim() || null,
                                    ratingNumeric,
                                    reviewCountText: activity.review_count?.trim() || null,
                                    reviewCountNumeric,
                                    duration: activity.duration?.trim() || null,
                                    description: activity.description?.trim() || null,
                                    extractionQuality: activity.extraction_quality || null,
                                    tags,
                                    url: activity.url || activity.activity_url || null,
                                },
                            });
                            processedCount++;
                        }
                    }
                    catch (error) {
                        console.error(`Error processing activity ${activity.id}:`, error);
                        errorCount++;
                    }
                }
                console.log(`✅ Batch ${batchNumber} completed: ${processedCount} total imported`);
            }
            catch (error) {
                console.error(`❌ Error processing batch starting at ${offset}:`, error);
                errorCount += batchSize;
            }
        }
        console.log(`\n📊 IMPORT SUMMARY:`);
        console.log(`✅ Successfully imported: ${processedCount} activities`);
        console.log(`❌ Errors: ${errorCount} activities`);
        console.log(`📈 Success rate: ${((processedCount / totalRecords) * 100).toFixed(1)}%`);
        // Generate report
        const report = `
# GYG Full Data Import Report

## Import Summary
- **Total Activities in GYG**: ${totalRecords}
- **Successfully Imported**: ${processedCount}
- **Errors**: ${errorCount}
- **Success Rate**: ${((processedCount / totalRecords) * 100).toFixed(1)}%

## Data Processing
- **Price Parsing**: Text prices converted to numeric values
- **Rating Parsing**: Text ratings converted to numeric values
- **Review Parsing**: Text review counts converted to numeric values
- **Tag Processing**: JSONB tags converted to arrays

## Benefits Achieved
1. **Structured Data**: All text fields parsed into structured format
2. **Numeric Analysis**: Can perform mathematical operations
3. **Full Control**: Complete control over data for analysis
4. **Integration**: Can combine with existing articles
5. **Performance**: Fast queries on local structured data

## Next Steps
1. **Run Analytics**: Use imported data for market research
2. **Data Cleaning**: Further refine and validate data
3. **Market Analysis**: Compare providers and pricing strategies
4. **Competitive Intelligence**: Analyze market positioning

## Usage Examples
\`\`\`typescript
// Query imported GYG data
const highRatedActivities = await mainPrisma.importedGYGActivity.findMany({
  where: { 
    ratingNumeric: { gte: 4.5 },
    priceNumeric: { lte: 100 }
  }
});

// Provider analysis
const providerStats = await mainPrisma.importedGYGActivity.groupBy({
  by: ['providerName'],
  _avg: { ratingNumeric: true, priceNumeric: true },
  _count: { id: true }
});
\`\`\`
`;
        // Save report
        await dual_prisma_1.mainPrisma.report.upsert({
            where: { type: 'gyg-full-import-report' },
            create: {
                type: 'gyg-full-import-report',
                title: 'GYG Full Data Import Report',
                content: report,
            },
            update: {
                title: 'GYG Full Data Import Report',
                content: report,
            },
        });
        console.log('✅ Import report saved to main database');
        console.log('\n🎉 FULL GYG DATA IMPORT COMPLETED SUCCESSFULLY!');
    }
    catch (error) {
        console.error('❌ Error during full GYG import:', error);
        throw error;
    }
    finally {
        await dual_prisma_1.gygPrisma.$disconnect();
        await dual_prisma_1.mainPrisma.$disconnect();
    }
}
function parsePriceFromText(priceText) {
    if (!priceText)
        return null;
    const match = priceText.match(/[€$]?(\d+(?:,\d+)?(?:\.\d+)?)/);
    return match ? parseFloat(match[1].replace(',', '')) : null;
}
function parseRatingFromText(ratingText) {
    if (!ratingText)
        return null;
    const match = ratingText.match(/(\d+(?:\.\d+)?)/);
    if (match) {
        const rating = parseFloat(match[1]);
        return rating >= 0 && rating <= 5 ? rating : null;
    }
    return null;
}
function parseReviewCountFromText(reviewText) {
    if (!reviewText)
        return null;
    const match = reviewText.match(/(\d+(?:,\d+)*)/);
    return match ? parseInt(match[1].replace(/,/g, '')) : null;
}
function parseTagsFromJSONB(tagsJSONB) {
    if (!tagsJSONB)
        return [];
    try {
        if (typeof tagsJSONB === 'string') {
            const parsed = JSON.parse(tagsJSONB);
            return Array.isArray(parsed) ? parsed : [];
        }
        else if (Array.isArray(tagsJSONB)) {
            return tagsJSONB;
        }
    }
    catch (error) {
        console.warn('Error parsing tags JSONB:', error);
    }
    return [];
}
// Run the script
if (require.main === module) {
    fullGYGImport().catch(console.error);
}
//# sourceMappingURL=full-gyg-import.js.map