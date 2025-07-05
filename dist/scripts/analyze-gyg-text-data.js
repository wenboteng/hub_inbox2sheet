"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeGYGTextData = analyzeGYGTextData;
const dual_prisma_1 = require("../lib/dual-prisma");
const slugify_1 = require("../utils/slugify");
async function analyzeGYGTextData() {
    console.log('🔍 ANALYZING GYG TEXT-BASED DATA...\n');
    try {
        await dual_prisma_1.gygPrisma.$connect();
        console.log('✅ Connected to GYG database');
        // Get total count
        const totalCount = await dual_prisma_1.gygPrisma.$queryRaw `SELECT COUNT(*) as count FROM activities`;
        const totalRecords = Number(totalCount[0]?.count || 0);
        console.log(`📊 Found ${totalRecords} total records`);
        // Analyze text-based data
        console.log('\n📈 ANALYZING TEXT-BASED STATISTICS...');
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
        // Text-based price analysis
        const textPrices = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT price, COUNT(*) as count
      FROM activities 
      WHERE price IS NOT NULL AND price != ''
      GROUP BY price
      ORDER BY count DESC
      LIMIT 10
    `;
        console.log('✅ Text price analysis extracted');
        // Text-based rating analysis
        const textRatings = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT rating, COUNT(*) as count
      FROM activities 
      WHERE rating IS NOT NULL AND rating != ''
      GROUP BY rating
      ORDER BY count DESC
      LIMIT 10
    `;
        console.log('✅ Text rating analysis extracted');
        // Text-based review count analysis
        const textReviews = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT review_count, COUNT(*) as count
      FROM activities 
      WHERE review_count IS NOT NULL AND review_count != ''
      GROUP BY review_count
      ORDER BY count DESC
      LIMIT 10
    `;
        console.log('✅ Text review analysis extracted');
        // Duration analysis
        const durations = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT duration, COUNT(*) as count
      FROM activities 
      WHERE duration IS NOT NULL AND duration != ''
      GROUP BY duration
      ORDER BY count DESC
      LIMIT 10
    `;
        console.log('✅ Duration analysis extracted');
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
        // Activity names analysis
        const activityNames = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT 
        activity_name,
        provider_name,
        location,
        price,
        rating,
        review_count,
        extraction_quality
      FROM activities 
      WHERE activity_name IS NOT NULL 
        AND extraction_quality = 'High'
      ORDER BY id
      LIMIT 20
    `;
        console.log('✅ Activity names analysis extracted');
        // Generate comprehensive report
        const report = `
# GetYourGuide Text-Based Data Analysis Report

## Overview
- **Total Activities**: ${totalRecords.toLocaleString()}
- **Locations Found**: ${locationList.length}
- **Providers Found**: ${providerList.length}

## Data Quality Distribution
${qualityStats.map((q) => `- ${q.extraction_quality}: ${Number(q.count)} activities (${((Number(q.count) / totalRecords) * 100).toFixed(1)}%)`).join('\n')}

## Top Locations
${locationList.map(loc => `- ${loc}`).join('\n')}

## Top Providers
${providerList.slice(0, 20).map(prov => `- ${prov}`).join('\n')}

## Text-Based Price Analysis
${textPrices.map((p) => `- ${p.price}: ${Number(p.count)} activities`).join('\n')}

## Text-Based Rating Analysis
${textRatings.map((r) => `- ${r.rating}: ${Number(r.count)} activities`).join('\n')}

## Text-Based Review Count Analysis
${textReviews.map((r) => `- ${r.review_count}: ${Number(r.count)} activities`).join('\n')}

## Duration Analysis
${durations.map((d) => `- ${d.duration}: ${Number(d.count)} activities`).join('\n')}

## Sample High-Quality Activities
${activityNames.map((activity) => `- **${activity.activity_name}** (${activity.provider_name})
    - Location: ${activity.location}
    - Price: ${activity.price || 'N/A'}
    - Rating: ${activity.rating || 'N/A'}
    - Reviews: ${activity.review_count || 'N/A'}
    - Quality: ${activity.extraction_quality}`).join('\n\n')}

## Data Insights
1. **High Quality Data**: ${((Number(qualityStats.find((q) => q.extraction_quality === 'High')?.count || 0) / totalRecords) * 100).toFixed(1)}% of activities have high extraction quality
2. **Location Coverage**: ${locationList.length} unique locations identified
3. **Provider Diversity**: ${providerList.length} different providers found
4. **Data Completeness**: Most activities have basic information (name, provider, location)

## Recommendations
1. **Data Enhancement**: Focus on extracting numeric values from text fields
2. **Quality Improvement**: Prioritize high-quality extraction for better insights
3. **Provider Analysis**: Analyze provider performance across different locations
4. **Market Research**: Use the rich text data for competitive analysis
5. **Data Cleaning**: Implement text parsing to extract structured data

## Next Steps
1. **Parse Text Prices**: Extract numeric values from price text (e.g., "€43" → 43)
2. **Parse Text Ratings**: Extract numeric values from rating text (e.g., "4.4" → 4.4)
3. **Parse Review Counts**: Extract numeric values from review text (e.g., "63,652" → 63652)
4. **Enhance Data Quality**: Improve extraction methods for better structured data
5. **Market Analysis**: Use the location and provider data for competitive insights
`;
        console.log('\n📊 GENERATED REPORT:');
        console.log(report);
        // Save report to main database
        try {
            await dual_prisma_1.mainPrisma.$connect();
            await dual_prisma_1.mainPrisma.report.upsert({
                where: { type: 'gyg-text-analysis' },
                create: {
                    type: 'gyg-text-analysis',
                    title: 'GetYourGuide Text-Based Data Analysis Report',
                    slug: (0, slugify_1.slugify)('GetYourGuide Text-Based Data Analysis Report'),
                    content: report,
                },
                update: {
                    title: 'GetYourGuide Text-Based Data Analysis Report',
                    slug: (0, slugify_1.slugify)('GetYourGuide Text-Based Data Analysis Report'),
                    content: report,
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
        console.log('\n🎉 GYG TEXT DATA ANALYSIS COMPLETED SUCCESSFULLY!');
    }
    catch (error) {
        console.error('❌ Error analyzing GYG text data:', error);
        throw error;
    }
    finally {
        await dual_prisma_1.gygPrisma.$disconnect();
    }
}
// Run the script
if (require.main === module) {
    analyzeGYGTextData().catch(console.error);
}
//# sourceMappingURL=analyze-gyg-text-data.js.map