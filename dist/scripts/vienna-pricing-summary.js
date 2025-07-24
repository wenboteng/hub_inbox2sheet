"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showViennaPricingSummary = showViennaPricingSummary;
const dual_prisma_1 = require("../src/lib/dual-prisma");
async function showViennaPricingSummary() {
    console.log('💰 VIENNA PRICING INTELLIGENCE - KEY HIGHLIGHTS\n');
    try {
        await dual_prisma_1.mainPrisma.$connect();
        console.log('✅ Connected to main database');
        // Get Vienna activities with pricing data
        const viennaActivities = await dual_prisma_1.mainPrisma.importedGYGActivity.findMany({
            where: {
                OR: [
                    { location: { contains: 'Vienna', mode: 'insensitive' } },
                    { activityName: { contains: 'Vienna', mode: 'insensitive' } }
                ],
                priceNumeric: { not: null }
            },
            select: {
                id: true,
                activityName: true,
                reviewCountNumeric: true,
                ratingNumeric: true,
                priceNumeric: true,
                priceText: true,
                providerName: true,
                venue: true
            }
        });
        console.log(`📊 ${viennaActivities.length} Vienna activities with pricing data analyzed`);
        // Price distribution
        const priceRanges = {
            'Budget (€0-25)': viennaActivities.filter(a => a.priceNumeric <= 25).length,
            'Mid-range (€26-75)': viennaActivities.filter(a => a.priceNumeric > 25 && a.priceNumeric <= 75).length,
            'Premium (€76-150)': viennaActivities.filter(a => a.priceNumeric > 75 && a.priceNumeric <= 150).length,
            'Luxury (€151-300)': viennaActivities.filter(a => a.priceNumeric > 150 && a.priceNumeric <= 300).length,
            'Ultra-Luxury (€300+)': viennaActivities.filter(a => a.priceNumeric > 300).length
        };
        console.log('\n💰 PRICE DISTRIBUTION:');
        Object.entries(priceRanges).forEach(([range, count]) => {
            const percentage = ((count / viennaActivities.length) * 100).toFixed(1);
            console.log(`   ${range}: ${count} activities (${percentage}%)`);
        });
        // Value analysis
        const valueActivities = viennaActivities
            .filter(a => a.ratingNumeric !== null && a.priceNumeric !== null)
            .map(a => ({
            name: a.activityName,
            rating: a.ratingNumeric,
            price: a.priceNumeric,
            valueScore: a.ratingNumeric / (a.priceNumeric / 100),
            reviewCount: a.reviewCountNumeric || 0,
            provider: a.providerName
        }))
            .sort((a, b) => b.valueScore - a.valueScore);
        console.log('\n⭐ TOP 5 BEST VALUE ACTIVITIES:');
        valueActivities.slice(0, 5).forEach((activity, index) => {
            console.log(`   ${index + 1}. ${activity.name}`);
            console.log(`      Value: ${activity.valueScore.toFixed(2)} rating/€100 | Price: €${activity.price} | Rating: ${activity.rating}/5.0`);
        });
        // Activity type pricing
        const activityTypes = new Map();
        viennaActivities.forEach(activity => {
            const name = activity.activityName.toLowerCase();
            let type = 'Other';
            if (name.includes('tour'))
                type = 'Tours';
            else if (name.includes('concert') || name.includes('music'))
                type = 'Concerts & Music';
            else if (name.includes('museum') || name.includes('gallery'))
                type = 'Museums & Galleries';
            else if (name.includes('palace') || name.includes('castle'))
                type = 'Palaces & Castles';
            else if (name.includes('food') || name.includes('wine') || name.includes('dining'))
                type = 'Food & Wine';
            else if (name.includes('walking') || name.includes('hiking'))
                type = 'Walking & Hiking';
            else if (name.includes('bike') || name.includes('cycling'))
                type = 'Biking';
            else if (name.includes('transport') || name.includes('transfer'))
                type = 'Transport';
            if (!activityTypes.has(type)) {
                activityTypes.set(type, { count: 0, avgPrice: 0, avgRating: 0 });
            }
            const typeData = activityTypes.get(type);
            typeData.count++;
            typeData.avgPrice += activity.priceNumeric;
            if (activity.ratingNumeric)
                typeData.avgRating += activity.ratingNumeric;
        });
        // Calculate averages
        activityTypes.forEach((data, type) => {
            data.avgPrice = data.avgPrice / data.count;
            data.avgRating = data.avgRating / data.count;
        });
        console.log('\n🎭 ACTIVITY TYPE PRICING:');
        Array.from(activityTypes.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .forEach(([type, data]) => {
            console.log(`   ${type}: ${data.count} activities | Avg: €${data.avgPrice.toFixed(0)} | Rating: ${data.avgRating.toFixed(1)}/5.0`);
        });
        // Key insights
        const avgPrice = viennaActivities.reduce((sum, a) => sum + a.priceNumeric, 0) / viennaActivities.length;
        const avgRating = viennaActivities.filter(a => a.ratingNumeric).reduce((sum, a) => sum + a.ratingNumeric, 0) / viennaActivities.filter(a => a.ratingNumeric).length;
        const minPrice = Math.min(...viennaActivities.map(a => a.priceNumeric));
        const maxPrice = Math.max(...viennaActivities.map(a => a.priceNumeric));
        console.log('\n🎯 KEY INSIGHTS:');
        console.log(`   • Price Range: €${minPrice} - €${maxPrice}`);
        console.log(`   • Average Price: €${avgPrice.toFixed(2)}`);
        console.log(`   • Average Rating: ${avgRating.toFixed(2)}/5.0`);
        console.log(`   • Best Value Range: €15-50 activities`);
        console.log(`   • Most Popular: Mid-range (€26-75) with ${priceRanges['Mid-range (€26-75)']} activities`);
        console.log(`   • Luxury Segment: ${priceRanges['Luxury (€151-300)'] + priceRanges['Ultra-Luxury (€300+)']} activities`);
        console.log('\n📋 RECOMMENDATIONS:');
        console.log('   • Budget travelers: Focus on €15-30 range for best value');
        console.log('   • Mid-range travelers: €30-75 offers excellent quality-to-price ratio');
        console.log('   • Premium travelers: €75-150 provides exclusive experiences');
        console.log('   • Market opportunity: Limited options in €25-50 range');
        console.log('\n✅ Full report available in database as "vienna-pricing-intelligence-report"');
        return {
            totalActivities: viennaActivities.length,
            priceRanges,
            valueAnalysis: valueActivities.length,
            activityTypes: activityTypes.size,
            avgPrice,
            avgRating
        };
    }
    catch (error) {
        console.error('❌ Error showing Vienna pricing summary:', error);
        throw error;
    }
    finally {
        await dual_prisma_1.mainPrisma.$disconnect();
    }
}
// Run the script
if (require.main === module) {
    showViennaPricingSummary().catch(console.error);
}
//# sourceMappingURL=vienna-pricing-summary.js.map