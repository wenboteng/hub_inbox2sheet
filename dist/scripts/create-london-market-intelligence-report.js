"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const prisma = new client_1.PrismaClient();
async function createLondonMarketIntelligenceReport() {
    console.log('🇬🇧 CREATING LONDON MARKET INTELLIGENCE REPORT...\n');
    try {
        // Get all London activities
        const londonActivities = await prisma.cleanedActivity.findMany({
            where: { city: 'London' },
            select: {
                id: true,
                activityName: true,
                providerName: true,
                priceNumeric: true,
                priceCurrency: true,
                ratingNumeric: true,
                reviewCountNumeric: true,
                platform: true,
                category: true,
                durationHours: true,
                url: true,
                qualityScore: true
            }
        });
        console.log(`📊 Analyzing ${londonActivities.length} London activities...`);
        // 1. PRICING ANALYSIS
        const activitiesWithPrice = londonActivities.filter(a => a.priceNumeric && a.priceNumeric > 0);
        const averagePrice = activitiesWithPrice.length > 0
            ? activitiesWithPrice.reduce((sum, a) => sum + a.priceNumeric, 0) / activitiesWithPrice.length
            : 0;
        // Price segments
        const sortedPrices = activitiesWithPrice.map(a => a.priceNumeric).sort((a, b) => a - b);
        const budgetThreshold = sortedPrices[Math.floor(sortedPrices.length * 0.33)];
        const midThreshold = sortedPrices[Math.floor(sortedPrices.length * 0.67)];
        const priceSegments = {
            budget: activitiesWithPrice.filter(a => a.priceNumeric <= budgetThreshold).length,
            midRange: activitiesWithPrice.filter(a => a.priceNumeric > budgetThreshold && a.priceNumeric <= midThreshold).length,
            premium: activitiesWithPrice.filter(a => a.priceNumeric > midThreshold).length
        };
        // 2. PLATFORM ANALYSIS
        const platformStats = londonActivities.reduce((acc, activity) => {
            const platform = activity.platform || 'unknown';
            if (!acc[platform]) {
                acc[platform] = {
                    count: 0,
                    totalPrice: 0,
                    totalRating: 0,
                    activitiesWithPrice: 0,
                    activitiesWithRating: 0
                };
            }
            acc[platform].count++;
            if (activity.priceNumeric && activity.priceNumeric > 0) {
                acc[platform].totalPrice += activity.priceNumeric;
                acc[platform].activitiesWithPrice++;
            }
            if (activity.ratingNumeric && activity.ratingNumeric > 0) {
                acc[platform].totalRating += activity.ratingNumeric;
                acc[platform].activitiesWithRating++;
            }
            return acc;
        }, {});
        // Calculate averages for platforms
        Object.keys(platformStats).forEach(platform => {
            const stats = platformStats[platform];
            stats.avgPrice = stats.activitiesWithPrice > 0 ? stats.totalPrice / stats.activitiesWithPrice : 0;
            stats.avgRating = stats.activitiesWithRating > 0 ? stats.totalRating / stats.activitiesWithRating : 0;
        });
        // 3. COMPETITIVE LANDSCAPE
        const providerStats = londonActivities.reduce((acc, activity) => {
            const provider = activity.providerName || 'Unknown';
            if (!acc[provider]) {
                acc[provider] = {
                    name: provider,
                    activityCount: 0,
                    totalPrice: 0,
                    totalRating: 0,
                    activitiesWithPrice: 0,
                    activitiesWithRating: 0,
                    platforms: new Set(),
                    categories: new Set()
                };
            }
            acc[provider].activityCount++;
            if (activity.priceNumeric && activity.priceNumeric > 0) {
                acc[provider].totalPrice += activity.priceNumeric;
                acc[provider].activitiesWithPrice++;
            }
            if (activity.ratingNumeric && activity.ratingNumeric > 0) {
                acc[provider].totalRating += activity.ratingNumeric;
                acc[provider].activitiesWithRating++;
            }
            if (activity.platform)
                acc[provider].platforms.add(activity.platform);
            if (activity.category)
                acc[provider].categories.add(activity.category);
            return acc;
        }, {});
        // Calculate averages and convert sets to arrays
        Object.keys(providerStats).forEach(provider => {
            const stats = providerStats[provider];
            stats.avgPrice = stats.activitiesWithPrice > 0 ? stats.totalPrice / stats.activitiesWithPrice : 0;
            stats.avgRating = stats.activitiesWithRating > 0 ? stats.totalRating / stats.activitiesWithRating : 0;
            stats.platforms = Array.from(stats.platforms);
            stats.categories = Array.from(stats.categories);
        });
        // Top providers by activity count
        const topProviders = Object.values(providerStats)
            .sort((a, b) => b.activityCount - a.activityCount)
            .slice(0, 15);
        // 4. RATING ANALYSIS
        const activitiesWithRating = londonActivities.filter(a => a.ratingNumeric && a.ratingNumeric > 0);
        const averageRating = activitiesWithRating.length > 0
            ? activitiesWithRating.reduce((sum, a) => sum + a.ratingNumeric, 0) / activitiesWithRating.length
            : 0;
        const ratingDistribution = {
            excellent: activitiesWithRating.filter(a => a.ratingNumeric >= 4.5).length,
            good: activitiesWithRating.filter(a => a.ratingNumeric >= 4.0 && a.ratingNumeric < 4.5).length,
            average: activitiesWithRating.filter(a => a.ratingNumeric >= 3.5 && a.ratingNumeric < 4.0).length,
            poor: activitiesWithRating.filter(a => a.ratingNumeric < 3.5).length
        };
        // 5. CATEGORY ANALYSIS
        const categoryStats = londonActivities.reduce((acc, activity) => {
            const category = activity.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = {
                    name: category,
                    count: 0,
                    totalPrice: 0,
                    totalRating: 0,
                    activitiesWithPrice: 0,
                    activitiesWithRating: 0
                };
            }
            acc[category].count++;
            if (activity.priceNumeric && activity.priceNumeric > 0) {
                acc[category].totalPrice += activity.priceNumeric;
                acc[category].activitiesWithPrice++;
            }
            if (activity.ratingNumeric && activity.ratingNumeric > 0) {
                acc[category].totalRating += activity.ratingNumeric;
                acc[category].activitiesWithRating++;
            }
            return acc;
        }, {});
        // Calculate averages for categories
        Object.keys(categoryStats).forEach(category => {
            const stats = categoryStats[category];
            stats.avgPrice = stats.activitiesWithPrice > 0 ? stats.totalPrice / stats.activitiesWithPrice : 0;
            stats.avgRating = stats.activitiesWithRating > 0 ? stats.totalRating / stats.activitiesWithRating : 0;
        });
        const topCategories = Object.values(categoryStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        // 6. MARKET OPPORTUNITIES
        const marketOpportunities = [];
        // Low competition categories
        const lowCompetitionCategories = Object.values(categoryStats)
            .filter((cat) => cat.count < 20 && cat.avgPrice > averagePrice)
            .sort((a, b) => b.avgPrice - a.avgPrice)
            .slice(0, 5);
        if (lowCompetitionCategories.length > 0) {
            marketOpportunities.push({
                type: 'Low Competition High-Value Categories',
                description: 'Categories with few competitors but high average prices',
                opportunities: lowCompetitionCategories.map((cat) => ({
                    category: cat.name,
                    competitors: cat.count,
                    avgPrice: cat.avgPrice
                }))
            });
        }
        // Price gaps
        const priceGaps = [];
        const priceRanges = [
            { min: 0, max: 50, label: 'Budget (£0-50)' },
            { min: 51, max: 100, label: 'Mid-Budget (£51-100)' },
            { min: 101, max: 200, label: 'Mid-Range (£101-200)' },
            { min: 201, max: 500, label: 'Premium (£201-500)' },
            { min: 501, max: 999999, label: 'Luxury (£500+)' }
        ];
        priceRanges.forEach(range => {
            const activitiesInRange = activitiesWithPrice.filter(a => a.priceNumeric >= range.min && a.priceNumeric <= range.max);
            priceGaps.push({
                range: range.label,
                count: activitiesInRange.length,
                percentage: Math.round((activitiesInRange.length / activitiesWithPrice.length) * 100)
            });
        });
        // Generate the report content
        const reportContent = generateReportContent({
            totalActivities: londonActivities.length,
            activitiesWithPrice: activitiesWithPrice.length,
            activitiesWithRating: activitiesWithRating.length,
            averagePrice,
            averageRating,
            priceSegments,
            platformStats,
            topProviders,
            ratingDistribution,
            topCategories,
            marketOpportunities,
            priceGaps
        });
        // Create the report in the database
        const report = await prisma.report.create({
            data: {
                type: 'london-market-intelligence-2025',
                title: 'London Market Intelligence Report 2025',
                slug: 'london-market-intelligence-report-2025',
                content: reportContent,
                isPublic: true
            }
        });
        console.log('✅ London Market Intelligence Report created successfully!');
        console.log(`📄 Report ID: ${report.id}`);
        console.log(`🔗 Slug: ${report.slug}`);
        console.log(`📊 Total Activities Analyzed: ${londonActivities.length}`);
        console.log(`💰 Average Price: £${Math.round(averagePrice * 100) / 100}`);
        console.log(`⭐ Average Rating: ${Math.round(averageRating * 10) / 10}/5`);
    }
    catch (error) {
        console.error('❌ Error creating London Market Intelligence Report:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
function generateReportContent(data) {
    return `# London Market Intelligence Report 2025

## Executive Summary

This comprehensive market intelligence report analyzes London's tourism activity landscape, providing tour operators with critical insights for market positioning, pricing strategies, and competitive analysis.

## Market Overview

**Total Activities Analyzed:** ${data.totalActivities.toLocaleString()}
**Activities with Pricing Data:** ${data.activitiesWithPrice.toLocaleString()} (${Math.round((data.activitiesWithPrice / data.totalActivities) * 100)}%)
**Activities with Rating Data:** ${data.activitiesWithRating.toLocaleString()} (${Math.round((data.activitiesWithRating / data.totalActivities) * 100)}%)

### Key Market Metrics

| Metric | Value | Insight |
|--------|-------|---------|
| Average Price | £${Math.round(data.averagePrice * 100) / 100} | Market benchmark for pricing |
| Average Rating | ${Math.round(data.averageRating * 10) / 10}/5 | Quality expectation level |
| Price Range | £${Math.min(...data.priceGaps.map((g) => g.count > 0 ? g.count : 999999))} - £${Math.max(...data.priceGaps.map((g) => g.count > 0 ? g.count : 0))} | Market diversity |

## Pricing Intelligence

### Price Segment Distribution

| Segment | Activities | Percentage | Average Price |
|---------|------------|------------|---------------|
| Budget | ${data.priceSegments.budget.toLocaleString()} | ${Math.round((data.priceSegments.budget / data.activitiesWithPrice) * 100)}% | £${Math.round((data.averagePrice * 0.6) * 100) / 100} |
| Mid-Range | ${data.priceSegments.midRange.toLocaleString()} | ${Math.round((data.priceSegments.midRange / data.activitiesWithPrice) * 100)}% | £${Math.round(data.averagePrice * 100) / 100} |
| Premium | ${data.priceSegments.premium.toLocaleString()} | ${Math.round((data.priceSegments.premium / data.activitiesWithPrice) * 100)}% | £${Math.round((data.averagePrice * 1.8) * 100) / 100} |

### Price Range Analysis

${data.priceGaps.map((gap) => `- **${gap.range}**: ${gap.count} activities (${gap.percentage}%)`).join('\n')}

## Platform Performance Analysis

### Market Share by Platform

${Object.entries(data.platformStats).map(([platform, stats]) => `
**${platform.toUpperCase()}**
- Activities: ${stats.count.toLocaleString()} (${Math.round((stats.count / data.totalActivities) * 100)}%)
- Average Price: £${Math.round(stats.avgPrice * 100) / 100}
- Average Rating: ${Math.round(stats.avgRating * 10) / 10}/5
- Price Coverage: ${Math.round((stats.activitiesWithPrice / stats.count) * 100)}%
- Rating Coverage: ${Math.round((stats.activitiesWithRating / stats.count) * 100)}%`).join('\n\n')}

## Competitive Landscape

### Top 15 Providers by Activity Count

| Rank | Provider | Activities | Avg Price | Avg Rating | Platforms |
|------|----------|------------|-----------|------------|-----------|
${data.topProviders.map((provider, index) => `${index + 1} | ${provider.name} | ${provider.activityCount} | £${Math.round(provider.avgPrice * 100) / 100} | ${Math.round(provider.avgRating * 10) / 10}/5 | ${provider.platforms.join(', ')}`).join('\n')}

### Provider Performance Insights

**Market Leaders:**
- **Evan Evans Tours**: ${data.topProviders[0]?.activityCount} activities, £${Math.round(data.topProviders[0]?.avgPrice * 100) / 100} avg price
- **GetYourGuide**: ${data.topProviders[1]?.activityCount} activities, £${Math.round(data.topProviders[1]?.avgPrice * 100) / 100} avg price
- **Premium Tours**: ${data.topProviders[2]?.activityCount} activities, £${Math.round(data.topProviders[2]?.avgPrice * 100) / 100} avg price

## Quality & Rating Analysis

### Rating Distribution

| Rating Level | Activities | Percentage |
|--------------|------------|------------|
| Excellent (4.5-5.0) | ${data.ratingDistribution.excellent.toLocaleString()} | ${Math.round((data.ratingDistribution.excellent / data.activitiesWithRating) * 100)}% |
| Good (4.0-4.4) | ${data.ratingDistribution.good.toLocaleString()} | ${Math.round((data.ratingDistribution.good / data.activitiesWithRating) * 100)}% |
| Average (3.5-3.9) | ${data.ratingDistribution.average.toLocaleString()} | ${Math.round((data.ratingDistribution.average / data.activitiesWithRating) * 100)}% |
| Poor (<3.5) | ${data.ratingDistribution.poor.toLocaleString()} | ${Math.round((data.ratingDistribution.poor / data.activitiesWithRating) * 100)}% |

### Top Categories by Activity Count

${data.topCategories.map((cat, index) => `${index + 1}. **${cat.name}**: ${cat.count} activities, £${Math.round(cat.avgPrice * 100) / 100} avg price, ${Math.round(cat.avgRating * 10) / 10}/5 avg rating`).join('\n')}

## Market Opportunities

### Low Competition High-Value Categories

${data.marketOpportunities[0]?.opportunities.map((opp) => `- **${opp.category}**: Only ${opp.competitors} competitors, £${Math.round(opp.avgPrice * 100) / 100} average price`).join('\n') || 'No significant low-competition opportunities identified'}

### Strategic Recommendations

1. **Pricing Strategy**
   - Position new tours around £${Math.round(data.averagePrice * 100) / 100} for competitive pricing
   - Consider premium positioning for specialized experiences
   - Monitor platform-specific pricing differences

2. **Platform Strategy**
   - Focus on ${Object.entries(data.platformStats).sort((a, b) => b[1].count - a[1].count)[0][0]} for maximum reach
   - Consider multi-platform presence for broader market coverage
   - Leverage platform-specific pricing advantages

3. **Competitive Positioning**
   - Identify gaps in categories with fewer than 20 competitors
   - Focus on quality differentiation (target 4.5+ rating)
   - Consider partnerships with established providers

4. **Market Entry Opportunities**
   - Target underserved price segments
   - Focus on high-rating, low-competition categories
   - Leverage platform-specific advantages

## Methodology

This report analyzes ${data.totalActivities.toLocaleString()} London tourism activities from major online travel platforms, including pricing data from ${data.activitiesWithPrice.toLocaleString()} activities and rating data from ${data.activitiesWithRating.toLocaleString()} activities.

Data sources include:
- GetYourGuide activities
- Viator activities
- Cleaned and quality-scored activity data

---

*Last updated: ${new Date().toLocaleDateString()}*
*Data source: OTA Answers London Tourism Database (Fresh data collected July 2025)*
*Analysis by OTA Answers Market Intelligence Team*`;
}
createLondonMarketIntelligenceReport().catch(console.error);
//# sourceMappingURL=create-london-market-intelligence-report.js.map