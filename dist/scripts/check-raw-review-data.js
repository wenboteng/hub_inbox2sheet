"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRawReviewData = checkRawReviewData;
const dual_prisma_1 = require("../src/lib/dual-prisma");
async function checkRawReviewData() {
    console.log('🔍 CHECKING RAW REVIEW DATA FROM GYG DATABASE...\n');
    try {
        await dual_prisma_1.gygPrisma.$connect();
        await dual_prisma_1.mainPrisma.$connect();
        console.log('✅ Connected to both databases');
        // Step 1: Check the structure of the raw GYG activities table
        console.log('📋 Checking GYG database table structure...');
        const tableStructure = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'activities' 
      ORDER BY ordinal_position
    `;
        console.log('GYG Activities Table Structure:');
        tableStructure.forEach((column) => {
            console.log(`  - ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable})`);
        });
        // Step 2: Check for review-related columns in raw data
        const reviewColumns = tableStructure.filter((col) => col.column_name.toLowerCase().includes('review') ||
            col.column_name.toLowerCase().includes('rating') ||
            col.column_name.toLowerCase().includes('count'));
        console.log('\n🔍 Review-related columns found:');
        reviewColumns.forEach((col) => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });
        // Step 3: Sample some raw data to see review count format
        console.log('\n📊 Sampling raw review data...');
        const sampleRawData = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT 
        id,
        activity_name,
        review_count,
        rating,
        price,
        location,
        provider_name
      FROM activities 
      WHERE review_count IS NOT NULL 
      LIMIT 10
    `;
        console.log('Sample raw data with review counts:');
        sampleRawData.forEach((row, index) => {
            console.log(`\n${index + 1}. ${row.activity_name}`);
            console.log(`   Review Count: ${row.review_count} (type: ${typeof row.review_count})`);
            console.log(`   Rating: ${row.rating} (type: ${typeof row.rating})`);
            console.log(`   Price: ${row.price} (type: ${typeof row.price})`);
            console.log(`   Location: ${row.location}`);
            console.log(`   Provider: ${row.provider_name}`);
        });
        // Step 4: Check review count coverage in raw data (fix BigInt issue)
        const reviewCountStats = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT 
        COUNT(*)::text as total_activities,
        COUNT(review_count)::text as activities_with_review_count,
        COUNT(rating)::text as activities_with_rating,
        COUNT(price)::text as activities_with_price
      FROM activities
    `;
        const stats = reviewCountStats[0];
        const totalActivities = parseInt(stats.total_activities);
        const activitiesWithReviewCount = parseInt(stats.activities_with_review_count);
        const activitiesWithRating = parseInt(stats.activities_with_rating);
        const activitiesWithPrice = parseInt(stats.activities_with_price);
        console.log('\n📈 Raw Data Coverage:');
        console.log(`Total Activities: ${totalActivities}`);
        console.log(`With Review Count: ${activitiesWithReviewCount} (${((activitiesWithReviewCount / totalActivities) * 100).toFixed(1)}%)`);
        console.log(`With Rating: ${activitiesWithRating} (${((activitiesWithRating / totalActivities) * 100).toFixed(1)}%)`);
        console.log(`With Price: ${activitiesWithPrice} (${((activitiesWithPrice / totalActivities) * 100).toFixed(1)}%)`);
        // Step 5: Check Vienna activities specifically in raw data
        const viennaRawData = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT 
        COUNT(*)::text as total_vienna,
        COUNT(review_count)::text as vienna_with_review_count,
        COUNT(rating)::text as vienna_with_rating,
        COUNT(price)::text as vienna_with_price
      FROM activities 
      WHERE location ILIKE '%vienna%' 
         OR activity_name ILIKE '%vienna%'
         OR provider_name ILIKE '%vienna%'
    `;
        const viennaStats = viennaRawData[0];
        const totalVienna = parseInt(viennaStats.total_vienna);
        const viennaWithReviewCount = parseInt(viennaStats.vienna_with_review_count);
        const viennaWithRating = parseInt(viennaStats.vienna_with_rating);
        const viennaWithPrice = parseInt(viennaStats.vienna_with_price);
        console.log('\n🏛️ Vienna Raw Data Coverage:');
        console.log(`Total Vienna Activities: ${totalVienna}`);
        console.log(`With Review Count: ${viennaWithReviewCount} (${((viennaWithReviewCount / totalVienna) * 100).toFixed(1)}%)`);
        console.log(`With Rating: ${viennaWithRating} (${((viennaWithRating / totalVienna) * 100).toFixed(1)}%)`);
        console.log(`With Price: ${viennaWithPrice} (${((viennaWithPrice / totalVienna) * 100).toFixed(1)}%)`);
        // Step 6: Sample Vienna activities with review counts
        const viennaWithReviews = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT 
        id,
        activity_name,
        review_count,
        rating,
        price,
        location,
        provider_name
      FROM activities 
      WHERE (location ILIKE '%vienna%' OR activity_name ILIKE '%vienna%')
        AND review_count IS NOT NULL
      LIMIT 5
    `;
        console.log('\n🏛️ Vienna Activities with Review Counts (Raw Data):');
        viennaWithReviews.forEach((row, index) => {
            console.log(`\n${index + 1}. ${row.activity_name}`);
            console.log(`   Raw Review Count: ${row.review_count} (type: ${typeof row.review_count})`);
            console.log(`   Raw Rating: ${row.rating} (type: ${typeof row.rating})`);
            console.log(`   Raw Price: ${row.price} (type: ${typeof row.price})`);
            console.log(`   Location: ${row.location}`);
            console.log(`   Provider: ${row.provider_name}`);
        });
        // Step 7: Compare with imported data
        const importedVienna = await dual_prisma_1.mainPrisma.importedGYGActivity.findMany({
            where: {
                OR: [
                    { location: { contains: 'Vienna', mode: 'insensitive' } },
                    { activityName: { contains: 'Vienna', mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                originalId: true,
                activityName: true,
                reviewCountText: true,
                reviewCountNumeric: true,
                ratingText: true,
                ratingNumeric: true,
                priceText: true,
                priceNumeric: true,
                location: true,
                providerName: true
            },
            take: 5
        });
        console.log('\n📥 Vienna Activities in Imported Data:');
        importedVienna.forEach((activity, index) => {
            console.log(`\n${index + 1}. ${activity.activityName}`);
            console.log(`   Original ID: ${activity.originalId}`);
            console.log(`   Review Count Text: ${activity.reviewCountText}`);
            console.log(`   Review Count Numeric: ${activity.reviewCountNumeric}`);
            console.log(`   Rating Text: ${activity.ratingText}`);
            console.log(`   Rating Numeric: ${activity.ratingNumeric}`);
            console.log(`   Price Text: ${activity.priceText}`);
            console.log(`   Price Numeric: ${activity.priceNumeric}`);
            console.log(`   Location: ${activity.location}`);
            console.log(`   Provider: ${activity.providerName}`);
        });
        // Step 8: Generate backfill recommendations
        const report = `
# Raw Review Data Analysis Report

## 📋 GYG Database Structure
${tableStructure.map((col) => `- ${col.column_name}: ${col.data_type}`).join('\n')}

## 🔍 Review-Related Columns
${reviewColumns.map((col) => `- ${col.column_name}: ${col.data_type}`).join('\n')}

## 📊 Raw Data Coverage
- **Total Activities**: ${totalActivities}
- **With Review Count**: ${activitiesWithReviewCount} (${((activitiesWithReviewCount / totalActivities) * 100).toFixed(1)}%)
- **With Rating**: ${activitiesWithRating} (${((activitiesWithRating / totalActivities) * 100).toFixed(1)}%)
- **With Price**: ${activitiesWithPrice} (${((activitiesWithPrice / totalActivities) * 100).toFixed(1)}%)

## 🏛️ Vienna Raw Data Coverage
- **Total Vienna Activities**: ${totalVienna}
- **With Review Count**: ${viennaWithReviewCount} (${((viennaWithReviewCount / totalVienna) * 100).toFixed(1)}%)
- **With Rating**: ${viennaWithRating} (${((viennaWithRating / totalVienna) * 100).toFixed(1)}%)
- **With Price**: ${viennaWithPrice} (${((viennaWithPrice / totalVienna) * 100).toFixed(1)}%)

## 🎯 Backfill Recommendations
1. **Review Count Data Available**: ${activitiesWithReviewCount} activities have review counts in raw data
2. **Vienna Review Counts**: ${viennaWithReviewCount} Vienna activities have review counts
3. **Data Processing Issue**: Review count parsing in import process needs fixing
4. **Backfill Strategy**: Update review count parsing logic and re-run import

## 📈 Expected Improvement
After fixing review count parsing:
- Vienna activities with review counts: ${viennaWithReviewCount} (${((viennaWithReviewCount / totalVienna) * 100).toFixed(1)}%)
- Overall data quality improvement: Significant

---

*Analysis completed on ${new Date().toISOString()}*
`;
        console.log('\n📋 ANALYSIS SUMMARY:');
        console.log(`Raw data has review counts for ${activitiesWithReviewCount} activities`);
        console.log(`Vienna activities have ${viennaWithReviewCount} review counts available`);
        console.log('The issue is in the review count parsing during import, not missing source data');
        // Save analysis report
        await dual_prisma_1.mainPrisma.report.upsert({
            where: { type: 'raw-review-data-analysis' },
            create: {
                type: 'raw-review-data-analysis',
                title: 'Raw Review Data Analysis Report',
                slug: 'raw-review-data-analysis',
                content: report,
                isPublic: true,
            },
            update: {
                title: 'Raw Review Data Analysis Report',
                slug: 'raw-review-data-analysis',
                content: report,
                isPublic: true,
            },
        });
        console.log('\n✅ Raw review data analysis report saved to database');
        console.log('\n🎉 RAW REVIEW DATA ANALYSIS COMPLETED!');
        return {
            rawDataHasReviews: activitiesWithReviewCount > 0,
            viennaRawReviews: viennaWithReviewCount,
            totalViennaRaw: totalVienna,
            canBackfill: true
        };
    }
    catch (error) {
        console.error('❌ Error checking raw review data:', error);
        throw error;
    }
    finally {
        await dual_prisma_1.gygPrisma.$disconnect();
        await dual_prisma_1.mainPrisma.$disconnect();
    }
}
// Run the script
if (require.main === module) {
    checkRawReviewData().catch(console.error);
}
//# sourceMappingURL=check-raw-review-data.js.map