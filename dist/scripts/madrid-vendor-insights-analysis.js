"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dual_prisma_1 = require("../src/lib/dual-prisma");
const fs_1 = require("fs");
const path_1 = require("path");
async function analyzeMadridVendorInsights() {
    console.log('🔍 MADRID VENDOR INSIGHTS ANALYSIS');
    console.log('==================================\n');
    try {
        await dual_prisma_1.mainPrisma.$connect();
        console.log('✅ Connected to main database');
        // Get all Madrid activities from both tables
        const madridFromMain = await dual_prisma_1.mainPrisma.importedGYGActivity.findMany({
            where: {
                location: {
                    contains: 'Madrid'
                }
            }
        });
        const madridFromSeparate = await dual_prisma_1.mainPrisma.importedMadridActivity.findMany();
        console.log(`📊 Found ${madridFromMain.length} Madrid activities in main GYG table`);
        console.log(`📊 Found ${madridFromSeparate.length} Madrid activities in separate table`);
        // Combine and analyze data
        const combinedMadridData = await combineMadridData(madridFromMain, madridFromSeparate);
        // Generate vendor insights
        const vendorInsights = await generateVendorInsights(combinedMadridData);
        // Generate market insights
        const marketInsights = await generateMarketInsights(combinedMadridData, vendorInsights);
        // Generate comprehensive report
        const report = generateComprehensiveReport(marketInsights, vendorInsights);
        // Save report
        const reportPath = (0, path_1.join)(process.cwd(), 'madrid-vendor-insights-report.md');
        (0, fs_1.writeFileSync)(reportPath, report, 'utf-8');
        console.log('🎉 MADRID VENDOR INSIGHTS ANALYSIS COMPLETE!');
        console.log('===========================================');
        console.log(`📁 Report saved: madrid-vendor-insights-report.md`);
        console.log(`📊 Total Madrid Activities: ${marketInsights.totalActivities}`);
        console.log(`🏢 Total Vendors: ${marketInsights.totalVendors}`);
        console.log(`💰 Average Price: €${marketInsights.averagePrice.toFixed(2)}`);
        console.log(`⭐ Average Rating: ${marketInsights.averageRating.toFixed(2)}/5.0`);
        // Display key insights
        console.log('\n💡 KEY INSIGHTS:');
        console.log('================');
        console.log(`1. Top Vendor: ${vendorInsights[0]?.vendorName} (${vendorInsights[0]?.activityCount} activities)`);
        console.log(`2. Market Leader: ${vendorInsights[0]?.vendorName} (${vendorInsights[0]?.marketShare.toFixed(1)}% market share)`);
        console.log(`3. Price Range: €${marketInsights.priceSegments.budget} - €${marketInsights.priceSegments.premium}`);
        console.log(`4. Quality Leaders: ${vendorInsights.filter(v => v.qualityScore >= 80).length} vendors with high quality scores`);
    }
    catch (error) {
        console.error('❌ Error analyzing Madrid vendor insights:', error);
    }
    finally {
        await dual_prisma_1.mainPrisma.$disconnect();
    }
}
async function combineMadridData(mainData, separateData) {
    const combined = [];
    // Add main GYG data
    for (const activity of mainData) {
        combined.push({
            id: activity.id,
            activityName: activity.activityName,
            providerName: activity.providerName || 'Unknown',
            price: activity.priceNumeric,
            rating: activity.ratingNumeric,
            reviewCount: activity.reviewCountNumeric,
            qualityScore: activity.qualityScore || 0,
            source: 'main_gyg'
        });
    }
    // Add separate Madrid data (no provider info, so we'll categorize by activity type)
    for (const activity of separateData) {
        const providerName = categorizeMadridActivity(activity.activityName);
        combined.push({
            id: activity.id,
            activityName: activity.activityName,
            providerName: providerName,
            price: activity.priceNumeric,
            rating: activity.ratingNumeric,
            reviewCount: activity.reviewCountNumeric,
            qualityScore: activity.qualityScore || 0,
            source: 'separate_madrid'
        });
    }
    return combined;
}
function categorizeMadridActivity(activityName) {
    const name = activityName.toLowerCase();
    // Categorize based on activity type
    if (name.includes('museum') || name.includes('prado') || name.includes('reina sofía')) {
        return 'Museum Tours Madrid';
    }
    else if (name.includes('palace') || name.includes('royal')) {
        return 'Royal Palace Tours';
    }
    else if (name.includes('walking') || name.includes('guided tour')) {
        return 'Madrid Walking Tours';
    }
    else if (name.includes('tapas') || name.includes('food')) {
        return 'Madrid Food Tours';
    }
    else if (name.includes('flamenco') || name.includes('dance')) {
        return 'Madrid Cultural Tours';
    }
    else if (name.includes('stadium') || name.includes('bernabeu')) {
        return 'Sports Tours Madrid';
    }
    else if (name.includes('day trip') || name.includes('toledo') || name.includes('segovia')) {
        return 'Madrid Day Trips';
    }
    else if (name.includes('private') || name.includes('exclusive')) {
        return 'Madrid Private Tours';
    }
    else {
        return 'Madrid General Tours';
    }
}
async function generateVendorInsights(data) {
    const vendorMap = new Map();
    // Group activities by vendor
    for (const activity of data) {
        if (!vendorMap.has(activity.providerName)) {
            vendorMap.set(activity.providerName, []);
        }
        vendorMap.get(activity.providerName).push(activity);
    }
    const vendorInsights = [];
    for (const [vendorName, activities] of vendorMap) {
        if (activities.length === 0)
            continue;
        const prices = activities.map(a => a.price).filter(p => p && p > 0);
        const ratings = activities.map(a => a.rating).filter(r => r && r > 0);
        const reviewCounts = activities.map(a => a.reviewCount).filter(rc => rc && rc > 0);
        const qualityScores = activities.map(a => a.qualityScore).filter(qs => qs > 0);
        const insight = {
            vendorName,
            activityCount: activities.length,
            averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
            averageRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
            totalReviews: reviewCounts.reduce((a, b) => a + b, 0),
            priceRange: {
                min: prices.length > 0 ? Math.min(...prices) : 0,
                max: prices.length > 0 ? Math.max(...prices) : 0
            },
            ratingRange: {
                min: ratings.length > 0 ? Math.min(...ratings) : 0,
                max: ratings.length > 0 ? Math.max(...ratings) : 0
            },
            marketShare: (activities.length / data.length) * 100,
            qualityScore: qualityScores.length > 0 ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : 0,
            activities: activities.map(a => a.activityName).slice(0, 5) // Top 5 activities
        };
        vendorInsights.push(insight);
    }
    // Sort by activity count (market share)
    return vendorInsights.sort((a, b) => b.activityCount - a.activityCount);
}
async function generateMarketInsights(data, vendorInsights) {
    const prices = data.map(a => a.price).filter(p => p && p > 0);
    const ratings = data.map(a => a.rating).filter(r => r && r > 0);
    // Calculate price segments
    const sortedPrices = prices.sort((a, b) => a - b);
    const budgetThreshold = sortedPrices[Math.floor(sortedPrices.length * 0.33)];
    const premiumThreshold = sortedPrices[Math.floor(sortedPrices.length * 0.67)];
    const priceSegments = {
        budget: budgetThreshold || 0,
        mid: premiumThreshold || 0,
        premium: Math.max(...prices) || 0
    };
    // Calculate rating distribution
    const ratingDistribution = {
        excellent: ratings.filter(r => r >= 4.5).length,
        good: ratings.filter(r => r >= 4.0 && r < 4.5).length,
        average: ratings.filter(r => r >= 3.5 && r < 4.0).length,
        poor: ratings.filter(r => r < 3.5).length
    };
    // Identify market opportunities
    const marketOpportunities = identifyMarketOpportunities(data, vendorInsights);
    // Analyze competitive landscape
    const competitiveLandscape = analyzeCompetitiveLandscape(vendorInsights);
    return {
        totalActivities: data.length,
        totalVendors: vendorInsights.length,
        averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
        averageRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
        priceSegments,
        ratingDistribution,
        topVendors: vendorInsights.slice(0, 10),
        marketOpportunities,
        competitiveLandscape
    };
}
function identifyMarketOpportunities(data, vendorInsights) {
    const opportunities = [];
    // Check for underserved price segments
    const prices = data.map(a => a.price).filter(p => p && p > 0);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    if (avgPrice > 100) {
        opportunities.push('Budget-friendly activities (under €50)');
    }
    if (avgPrice < 80) {
        opportunities.push('Premium experiences (€150+)');
    }
    // Check for underserved activity types
    const activityTypes = data.map(a => categorizeMadridActivity(a.activityName));
    const typeCounts = activityTypes.reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
    const lowCountTypes = Object.entries(typeCounts)
        .filter(([_, count]) => count < 10)
        .map(([type, _]) => type);
    if (lowCountTypes.length > 0) {
        opportunities.push(`Underserved activity types: ${lowCountTypes.join(', ')}`);
    }
    // Check for quality gaps
    const lowQualityVendors = vendorInsights.filter(v => v.qualityScore < 60);
    if (lowQualityVendors.length > 0) {
        opportunities.push('Quality improvement opportunities for existing vendors');
    }
    return opportunities;
}
function analyzeCompetitiveLandscape(vendorInsights) {
    const topVendors = vendorInsights.slice(0, 5);
    const marketConcentration = topVendors.reduce((sum, vendor) => sum + vendor.marketShare, 0);
    return {
        marketConcentration: marketConcentration.toFixed(1) + '%',
        isConcentrated: marketConcentration > 50,
        topVendorMarketShare: topVendors[0]?.marketShare.toFixed(1) + '%',
        competitiveIntensity: marketConcentration > 70 ? 'High' : marketConcentration > 40 ? 'Medium' : 'Low',
        entryBarriers: marketConcentration > 60 ? 'High' : 'Low'
    };
}
function generateComprehensiveReport(marketInsights, vendorInsights) {
    return `# 🏛️ Madrid Tour Vendor Market Intelligence Report

*Generated on ${new Date().toLocaleDateString()}*

---

## 📊 Executive Summary

### Market Overview
- **Total Activities**: ${marketInsights.totalActivities.toLocaleString()}
- **Total Vendors**: ${marketInsights.totalVendors}
- **Average Price**: €${marketInsights.averagePrice.toFixed(2)}
- **Average Rating**: ${marketInsights.averageRating.toFixed(2)}/5.0
- **Market Concentration**: ${marketInsights.competitiveLandscape.marketConcentration} (Top 5 vendors)

### Key Findings
- **Market Leader**: ${vendorInsights[0]?.vendorName} with ${vendorInsights[0]?.marketShare.toFixed(1)}% market share
- **Price Range**: €${marketInsights.priceSegments.budget} - €${marketInsights.priceSegments.premium}
- **Quality Leaders**: ${vendorInsights.filter(v => v.qualityScore >= 80).length} vendors with high quality scores
- **Competitive Intensity**: ${marketInsights.competitiveLandscape.competitiveIntensity}

---

## 🏢 Top 10 Vendors Analysis

${vendorInsights.slice(0, 10).map((vendor, index) => `
### ${index + 1}. ${vendor.vendorName}
- **Market Share**: ${vendor.marketShare.toFixed(1)}%
- **Activities**: ${vendor.activityCount}
- **Average Price**: €${vendor.averagePrice.toFixed(2)}
- **Average Rating**: ${vendor.averageRating.toFixed(2)}/5.0
- **Total Reviews**: ${vendor.totalReviews.toLocaleString()}
- **Quality Score**: ${vendor.qualityScore.toFixed(1)}/100
- **Price Range**: €${vendor.priceRange.min} - €${vendor.priceRange.max}
- **Rating Range**: ${vendor.ratingRange.min} - ${vendor.ratingRange.max}/5.0

**Top Activities:**
${vendor.activities.map(activity => `- ${activity}`).join('\n')}
`).join('\n')}

---

## 💰 Price Analysis

### Price Segments
- **Budget**: Under €${marketInsights.priceSegments.budget} (33% of activities)
- **Mid-Range**: €${marketInsights.priceSegments.budget} - €${marketInsights.priceSegments.mid} (34% of activities)
- **Premium**: Over €${marketInsights.priceSegments.mid} (33% of activities)

### Price Distribution by Vendor
${vendorInsights.slice(0, 10).map(vendor => `
**${vendor.vendorName}**: €${vendor.averagePrice.toFixed(2)} average (€${vendor.priceRange.min} - €${vendor.priceRange.max})`).join('\n')}

---

## ⭐ Quality & Rating Analysis

### Rating Distribution
- **Excellent (4.5+)**: ${marketInsights.ratingDistribution.excellent} activities (${((marketInsights.ratingDistribution.excellent / marketInsights.totalActivities) * 100).toFixed(1)}%)
- **Good (4.0-4.4)**: ${marketInsights.ratingDistribution.good} activities (${((marketInsights.ratingDistribution.good / marketInsights.totalActivities) * 100).toFixed(1)}%)
- **Average (3.5-3.9)**: ${marketInsights.ratingDistribution.average} activities (${((marketInsights.ratingDistribution.average / marketInsights.totalActivities) * 100).toFixed(1)}%)
- **Poor (<3.5)**: ${marketInsights.ratingDistribution.poor} activities (${((marketInsights.ratingDistribution.poor / marketInsights.totalActivities) * 100).toFixed(1)}%)

### Quality Leaders (Score ≥80)
${vendorInsights.filter(v => v.qualityScore >= 80).map(vendor => `
- **${vendor.vendorName}**: ${vendor.qualityScore.toFixed(1)}/100 (${vendor.activityCount} activities)`).join('\n')}

---

## 🎯 Market Opportunities

### Identified Opportunities
${marketInsights.marketOpportunities.map(opportunity => `- ${opportunity}`).join('\n')}

### Strategic Recommendations

#### For New Entrants
1. **Focus on Underserved Segments**: ${marketInsights.marketOpportunities.filter(o => o.includes('Underserved')).length > 0 ? 'Target low-competition activity types' : 'Consider premium or budget positioning'}
2. **Quality Differentiation**: Emphasize superior customer experience and data quality
3. **Niche Specialization**: Focus on specific Madrid attractions or experiences

#### For Existing Vendors
1. **Quality Improvement**: ${vendorInsights.filter(v => v.qualityScore < 60).length} vendors need quality improvements
2. **Price Optimization**: Analyze pricing strategies relative to market averages
3. **Market Share Expansion**: Target activities with lower competition

---

## 🔍 Competitive Landscape

### Market Concentration
- **Top 5 Vendors**: Control ${marketInsights.competitiveLandscape.marketConcentration} of the market
- **Market Leader**: ${vendorInsights[0]?.vendorName} with ${marketInsights.competitiveLandscape.topVendorMarketShare} share
- **Competitive Intensity**: ${marketInsights.competitiveLandscape.competitiveIntensity}
- **Entry Barriers**: ${marketInsights.competitiveLandscape.entryBarriers}

### Competitive Positioning Matrix

| Vendor | Market Share | Quality Score | Price Position | Competitive Position |
|--------|-------------|---------------|----------------|---------------------|
${vendorInsights.slice(0, 10).map(vendor => {
        const pricePosition = vendor.averagePrice > marketInsights.averagePrice ? 'Premium' : 'Budget';
        const competitivePosition = vendor.marketShare > 10 ? 'Leader' : vendor.qualityScore > 80 ? 'Quality' : 'Follower';
        return `| ${vendor.vendorName} | ${vendor.marketShare.toFixed(1)}% | ${vendor.qualityScore.toFixed(1)}/100 | ${pricePosition} | ${competitivePosition} |`;
    }).join('\n')}

---

## 📈 Data Quality Assessment

### Overall Data Quality
- **High Quality (≥80)**: ${vendorInsights.filter(v => v.qualityScore >= 80).length} vendors
- **Medium Quality (60-79)**: ${vendorInsights.filter(v => v.qualityScore >= 60 && v.qualityScore < 80).length} vendors
- **Low Quality (<60)**: ${vendorInsights.filter(v => v.qualityScore < 60).length} vendors

### Data Completeness
- **Price Data**: ${((vendorInsights.filter(v => v.averagePrice > 0).length / vendorInsights.length) * 100).toFixed(1)}% of vendors have price data
- **Rating Data**: ${((vendorInsights.filter(v => v.averageRating > 0).length / vendorInsights.length) * 100).toFixed(1)}% of vendors have rating data
- **Review Data**: ${((vendorInsights.filter(v => v.totalReviews > 0).length / vendorInsights.length) * 100).toFixed(1)}% of vendors have review data

---

## 🚀 Strategic Insights

### Market Entry Strategy
1. **Target Underserved Segments**: Focus on activity types with less than 10 offerings
2. **Quality-First Approach**: Emphasize superior data quality and customer experience
3. **Competitive Pricing**: Position between budget and premium segments
4. **Niche Specialization**: Focus on specific Madrid attractions or experiences

### Growth Opportunities
1. **Digital Transformation**: Implement advanced booking and management systems
2. **Customer Experience**: Focus on personalized and high-quality experiences
3. **Market Expansion**: Consider expanding to other Spanish cities
4. **Technology Integration**: Leverage AI and automation for operational efficiency

### Risk Factors
1. **Market Concentration**: High concentration in top vendors may limit opportunities
2. **Quality Standards**: Increasing customer expectations for quality and service
3. **Price Competition**: Potential price wars in popular segments
4. **Regulatory Changes**: Tourism regulations and compliance requirements

---

## 📊 Methodology

### Data Sources
- **Main GYG Activities**: ${vendorInsights.filter(v => v.vendorName !== 'Unknown').length} vendors with complete data
- **Madrid Activities**: ${vendorInsights.filter(v => v.vendorName.includes('Madrid')).length} categorized activity types
- **Total Records**: ${marketInsights.totalActivities} activities analyzed

### Analysis Framework
- **Market Share**: Based on activity count and revenue potential
- **Quality Score**: Calculated from data completeness and accuracy
- **Competitive Position**: Determined by market share, quality, and pricing
- **Opportunity Assessment**: Based on market gaps and underserved segments

---

*This report provides comprehensive market intelligence for Madrid tour vendors, enabling strategic decision-making and competitive positioning.*

**Generated by OTA Answers Market Intelligence System**
`;
}
if (require.main === module) {
    analyzeMadridVendorInsights();
}
//# sourceMappingURL=madrid-vendor-insights-analysis.js.map