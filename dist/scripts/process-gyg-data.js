"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processGYGData = processGYGData;
const dual_prisma_1 = require("../lib/dual-prisma");
async function processGYGData() {
    console.log('🔄 PROCESSING GYG DATA FOR ANALYSIS...\n');
    try {
        await dual_prisma_1.gygPrisma.$connect();
        console.log('✅ Connected to GYG database');
        // Get activities with basic filtering
        const activities = await dual_prisma_1.gygPrisma.$queryRaw `
      SELECT 
        id, title, description, location, price, rating, 
        review_count, category, duration, provider, url, created_at
      FROM activities 
      WHERE title IS NOT NULL 
        AND location IS NOT NULL 
        AND price IS NOT NULL 
        AND rating IS NOT NULL
      ORDER BY rating DESC, review_count DESC
      LIMIT 5000
    `;
        console.log(`📊 Processing ${activities.length} activities`);
        // Calculate basic statistics
        let totalPrice = 0;
        let totalRating = 0;
        let validActivities = 0;
        for (const activity of activities) {
            const price = parseFloat(activity.price?.replace(/[^\d.,]/g, '') || '0');
            const rating = parseFloat(activity.rating || '0');
            if (price > 0 && rating > 0 && rating <= 5) {
                totalPrice += price;
                totalRating += rating;
                validActivities++;
            }
        }
        const avgPrice = totalPrice / validActivities;
        const avgRating = totalRating / validActivities;
        // Calculate price and rating ranges
        const prices = activities.map(a => parseFloat(a.price?.replace(/[^\d.,]/g, '') || '0')).filter(p => p > 0);
        const ratings = activities.map(a => parseFloat(a.rating || '0')).filter(r => r > 0);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const minRating = Math.min(...ratings);
        const maxRating = Math.max(...ratings);
        // Generate insights report
        const report = `
# GetYourGuide Data Processing Report

## Overview
- **Total Activities Processed**: ${activities.length}
- **Valid Activities**: ${validActivities}
- **Average Price**: $${avgPrice.toFixed(2)}
- **Average Rating**: ${avgRating.toFixed(2)}/5.0

## Data Quality
- **Success Rate**: ${((validActivities / activities.length) * 100).toFixed(1)}%
- **Price Range**: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}
- **Rating Range**: ${minRating.toFixed(1)} - ${maxRating.toFixed(1)}

## Top Rated Activities
${activities
            .filter(a => parseFloat(a.rating || '0') >= 4.5)
            .slice(0, 10)
            .map(a => `- ${a.title} (${a.location}): ${a.rating}/5.0, $${a.price}`)
            .join('\n')}

## Processing completed successfully!
`;
        console.log('\n📊 GENERATED REPORT:');
        console.log(report);
        // Save to main database
        try {
            await dual_prisma_1.mainPrisma.$connect();
            await dual_prisma_1.mainPrisma.report.upsert({
                where: { type: 'gyg-processing' },
                create: {
                    type: 'gyg-processing',
                    title: 'GetYourGuide Data Processing Report',
                    content: report,
                },
                update: {
                    title: 'GetYourGuide Data Processing Report',
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
        console.log('\n🎉 GYG DATA PROCESSING COMPLETED!');
    }
    catch (error) {
        console.error('❌ Error processing GYG data:', error);
        throw error;
    }
    finally {
        await dual_prisma_1.gygPrisma.$disconnect();
    }
}
// Run the script
if (require.main === module) {
    processGYGData().catch(console.error);
}
//# sourceMappingURL=process-gyg-data.js.map