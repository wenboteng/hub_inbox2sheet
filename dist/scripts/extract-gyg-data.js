"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractGYGData = extractGYGData;
const dual_prisma_1 = require("../lib/dual-prisma");
const slugify_1 = require("../utils/slugify");
async function extractGYGData() {
    console.log('🔍 EXTRACTING GYG DATA FROM SECONDARY DATABASE...\n');
    try {
        await dual_prisma_1.gygPrisma.$connect();
        console.log('✅ Connected to GYG database');
        // Get total count
        const totalCount = await dual_prisma_1.gygPrisma.$queryRaw `SELECT COUNT(*) as count FROM activities`;
        const totalRecords = Number(totalCount[0]?.count || 0);
        console.log(`📊 Found ${totalRecords} total records`);
        // Extract basic statistics
        console.log('\n📈 EXTRACTING BASIC STATISTICS...');
        // Locations
        const locations = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT DISTINCT location 
      FROM activities 
      WHERE location IS NOT NULL AND location != ''
      ORDER BY location
    `;
        const locationList = locations.map((l) => l.location);
        console.log(`✅ Found ${locationList.length} locations`);
        // Providers
        const providers = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT DISTINCT provider_name 
      FROM activities 
      WHERE provider_name IS NOT NULL AND provider_name != ''
      ORDER BY provider_name
    `;
        const providerList = providers.map((p) => p.provider_name);
        console.log(`✅ Found ${providerList.length} providers`);
        // Price statistics (using price_numeric when available, otherwise parse price text)
        const priceStats = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT 
        MIN(price_numeric) as min_price,
        MAX(price_numeric) as max_price,
        AVG(price_numeric) as avg_price,
        COUNT(price_numeric) as numeric_count
      FROM activities 
      WHERE price_numeric IS NOT NULL
    `;
        const priceData = priceStats[0];
        console.log('✅ Price statistics extracted');
        // Rating statistics (using rating_numeric when available)
        const ratingStats = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT 
        AVG(rating_numeric) as avg_rating,
        COUNT(rating_numeric) as total_ratings,
        MIN(rating_numeric) as min_rating,
        MAX(rating_numeric) as max_rating
      FROM activities 
      WHERE rating_numeric IS NOT NULL
    `;
        const ratingData = ratingStats[0];
        console.log('✅ Rating statistics extracted');
        // Review count statistics
        const reviewStats = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT 
        AVG(review_count_numeric) as avg_reviews,
        COUNT(review_count_numeric) as total_with_reviews,
        MAX(review_count_numeric) as max_reviews
      FROM activities 
      WHERE review_count_numeric IS NOT NULL
    `;
        const reviewData = reviewStats[0];
        console.log('✅ Review statistics extracted');
        // Market segments
        const marketSegments = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT DISTINCT market_segment 
      FROM activities 
      WHERE market_segment IS NOT NULL AND market_segment != ''
      ORDER BY market_segment
    `;
        const segmentList = marketSegments.map((s) => s.market_segment);
        console.log(`✅ Found ${segmentList.length} market segments`);
        // Popularity levels
        const popularityLevels = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT DISTINCT popularity_level 
      FROM activities 
      WHERE popularity_level IS NOT NULL AND popularity_level != ''
      ORDER BY popularity_level
    `;
        const popularityList = popularityLevels.map((p) => p.popularity_level);
        console.log(`✅ Found ${popularityList.length} popularity levels`);
        // Data quality analysis
        const qualityStats = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT 
        extraction_quality,
        COUNT(*) as count
      FROM activities 
      WHERE extraction_quality IS NOT NULL
      GROUP BY extraction_quality
      ORDER BY count DESC
    `;
        console.log('✅ Data quality analysis extracted');
        // Generate comprehensive report
        const report = `
# GetYourGuide Data Analysis Report

## Overview
- **Total Activities**: ${totalRecords.toLocaleString()}
- **Locations Found**: ${locationList.length}
- **Providers Found**: ${providerList.length}
- **Market Segments**: ${segmentList.length}
- **Popularity Levels**: ${popularityList.length}

## Price Analysis
- **Numeric Price Records**: ${Number(priceData?.numeric_count || 0).toLocaleString()}
- **Price Range**: €${Number(priceData?.min_price || 0).toFixed(2)} - €${Number(priceData?.max_price || 0).toFixed(2)}
- **Average Price**: €${Number(priceData?.avg_price || 0).toFixed(2)}

## Rating Analysis
- **Activities with Ratings**: ${Number(ratingData?.total_ratings || 0).toLocaleString()}
- **Average Rating**: ${Number(ratingData?.avg_rating || 0).toFixed(2)}/5.0
- **Rating Range**: ${Number(ratingData?.min_rating || 0).toFixed(1)} - ${Number(ratingData?.max_rating || 0).toFixed(1)}

## Review Analysis
- **Activities with Reviews**: ${Number(reviewData?.total_with_reviews || 0).toLocaleString()}
- **Average Review Count**: ${Number(reviewData?.avg_reviews || 0).toFixed(0)}
- **Maximum Reviews**: ${Number(reviewData?.max_reviews || 0).toLocaleString()}

## Data Quality
${qualityStats.map((q) => `- ${q.extraction_quality}: ${Number(q.count)} activities`).join('\n')}

## Top Locations
${locationList.slice(0, 15).map(loc => `- ${loc}`).join('\n')}

## Top Providers
${providerList.slice(0, 15).map(prov => `- ${prov}`).join('\n')}

## Market Segments
${segmentList.map(seg => `- ${seg}`).join('\n')}

## Popularity Levels
${popularityList.map(pop => `- ${pop}`).join('\n')}

## Sample High-Quality Activities
${await getSampleActivities()}

## Data Insights
1. **Data Coverage**: ${((Number(ratingData?.total_ratings || 0) / totalRecords) * 100).toFixed(1)}% of activities have ratings
2. **Price Coverage**: ${((Number(priceData?.numeric_count || 0) / totalRecords) * 100).toFixed(1)}% of activities have numeric prices
3. **Review Coverage**: ${((Number(reviewData?.total_with_reviews || 0) / totalRecords) * 100).toFixed(1)}% of activities have review counts
4. **Quality Distribution**: ${qualityStats.map((q) => `${q.extraction_quality}: ${((Number(q.count) / totalRecords) * 100).toFixed(1)}%`).join(', ')}

## Recommendations
1. **Data Enhancement**: Focus on extracting more numeric prices and ratings
2. **Market Analysis**: Leverage market segments for competitive analysis
3. **Quality Improvement**: Prioritize high-quality extraction for better insights
4. **Provider Analysis**: Analyze provider performance across different segments
`;
        console.log('\n📊 GENERATED REPORT:');
        console.log(report);
        // Save report to main database
        try {
            await dual_prisma_1.mainPrisma.$connect();
            await dual_prisma_1.mainPrisma.report.upsert({
                where: { type: 'gyg-data-analysis' },
                create: {
                    type: 'gyg-data-analysis',
                    title: 'GetYourGuide Data Analysis Report',
                    slug: (0, slugify_1.slugify)('GetYourGuide Data Analysis Report'),
                    content: report,
                    isPublic: false,
                },
                update: {
                    title: 'GetYourGuide Data Analysis Report',
                    slug: (0, slugify_1.slugify)('GetYourGuide Data Analysis Report'),
                    content: report,
                    isPublic: false,
                },
            });
            console.log('✅ Report saved to main database');
        }
        catch (error) {
            console.error('❌ Error saving report to database:', error);
        }
        finally {
            await dual_prisma_1.mainPrisma.$disconnect();
        }
        console.log('\n🎉 GYG DATA EXTRACTION COMPLETED SUCCESSFULLY!');
    }
    catch (error) {
        console.error('❌ Error extracting GYG data:', error);
        throw error;
    }
    finally {
        await dual_prisma_1.gygPrisma.$disconnect();
    }
}
async function getSampleActivities() {
    try {
        const sampleActivities = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT 
        activity_name, 
        provider_name, 
        location, 
        rating_numeric, 
        review_count_numeric, 
        price_numeric,
        extraction_quality
      FROM activities 
      WHERE rating_numeric IS NOT NULL 
        AND price_numeric IS NOT NULL 
        AND extraction_quality = 'High'
      ORDER BY rating_numeric DESC, review_count_numeric DESC
      LIMIT 10
    `;
        return sampleActivities.map((activity) => `- ${activity.activity_name} (${activity.provider_name}): ${activity.rating_numeric}/5.0, ${activity.review_count_numeric} reviews, €${activity.price_numeric}`).join('\n');
    }
    catch (error) {
        return 'Error retrieving sample activities';
    }
}
// Run the script
if (require.main === module) {
    extractGYGData().catch(console.error);
}
//# sourceMappingURL=extract-gyg-data.js.map