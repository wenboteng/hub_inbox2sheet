"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const prisma = new client_1.PrismaClient();
async function deployLondonReportToProduction() {
    console.log('🚀 DEPLOYING LONDON REPORT TO PRODUCTION...\n');
    console.log('This script can be run directly on production server\n');
    try {
        // Check if report already exists
        const existingReport = await prisma.report.findFirst({
            where: { slug: 'london-market-intelligence-report-2025' }
        });
        if (existingReport) {
            console.log('⚠️  Report already exists! Updating...');
            await prisma.report.update({
                where: { id: existingReport.id },
                data: {
                    title: 'London Market Intelligence Report 2025',
                    content: await generateReportContent(),
                    updatedAt: new Date()
                }
            });
            console.log('✅ Report updated successfully!');
        }
        else {
            console.log('📊 Generating new report...');
            await prisma.report.create({
                data: {
                    type: 'london-market-intelligence-2025',
                    title: 'London Market Intelligence Report 2025',
                    slug: 'london-market-intelligence-report-2025',
                    content: await generateReportContent(),
                    isPublic: true
                }
            });
            console.log('✅ Report created successfully!');
        }
        console.log('\n🎉 LONDON REPORT IS NOW LIVE!');
        console.log('================================');
        console.log('📄 Report ID: london-market-intelligence-report-2025');
        console.log('🔗 API Endpoint: /api/reports/london-market-intelligence-report-2025');
        console.log('🌐 Direct URL: /reports/london-market-intelligence-report-2025');
        console.log('📊 Status: Public and accessible');
        console.log('\n✅ No code deployment required - report is ready!');
    }
    catch (error) {
        console.error('❌ Error deploying report:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
async function generateReportContent() {
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
    // Calculate statistics
    const activitiesWithPrice = londonActivities.filter(a => a.priceNumeric && a.priceNumeric > 0);
    const activitiesWithRating = londonActivities.filter(a => a.ratingNumeric && a.ratingNumeric > 0);
    const averagePrice = activitiesWithPrice.length > 0
        ? activitiesWithPrice.reduce((sum, a) => sum + a.priceNumeric, 0) / activitiesWithPrice.length
        : 0;
    const averageRating = activitiesWithRating.length > 0
        ? activitiesWithRating.reduce((sum, a) => sum + a.ratingNumeric, 0) / activitiesWithRating.length
        : 0;
    // Platform analysis
    const platformStats = londonActivities.reduce((acc, activity) => {
        const platform = activity.platform || 'unknown';
        if (!acc[platform]) {
            acc[platform] = { count: 0, totalPrice: 0, totalRating: 0, activitiesWithPrice: 0, activitiesWithRating: 0 };
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
    // Calculate averages
    Object.keys(platformStats).forEach(platform => {
        const stats = platformStats[platform];
        stats.avgPrice = stats.activitiesWithPrice > 0 ? stats.totalPrice / stats.activitiesWithPrice : 0;
        stats.avgRating = stats.activitiesWithRating > 0 ? stats.totalRating / stats.activitiesWithRating : 0;
    });
    // Provider analysis
    const providerStats = londonActivities.reduce((acc, activity) => {
        const provider = activity.providerName || 'Unknown';
        if (!acc[provider]) {
            acc[provider] = {
                name: provider,
                activityCount: 0,
                totalPrice: 0,
                totalRating: 0,
                activitiesWithPrice: 0,
                activitiesWithRating: 0
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
        return acc;
    }, {});
    // Calculate provider averages
    Object.keys(providerStats).forEach(provider => {
        const stats = providerStats[provider];
        stats.avgPrice = stats.activitiesWithPrice > 0 ? stats.totalPrice / stats.activitiesWithPrice : 0;
        stats.avgRating = stats.activitiesWithRating > 0 ? stats.totalRating / stats.activitiesWithRating : 0;
    });
    const topProviders = Object.values(providerStats)
        .sort((a, b) => b.activityCount - a.activityCount)
        .slice(0, 10);
    // Rating distribution
    const ratingDistribution = {
        excellent: activitiesWithRating.filter(a => a.ratingNumeric >= 4.5).length,
        good: activitiesWithRating.filter(a => a.ratingNumeric >= 4.0 && a.ratingNumeric < 4.5).length,
        average: activitiesWithRating.filter(a => a.ratingNumeric >= 3.5 && a.ratingNumeric < 4.0).length,
        poor: activitiesWithRating.filter(a => a.ratingNumeric < 3.5).length
    };
    return `# London Market Intelligence Report 2025

## Executive Summary

This comprehensive market intelligence report analyzes London's tourism activity landscape, providing tour operators with critical insights for market positioning, pricing strategies, and competitive analysis.

## Market Overview

**Total Activities Analyzed:** ${londonActivities.length.toLocaleString()}
**Activities with Pricing Data:** ${activitiesWithPrice.length.toLocaleString()} (${Math.round((activitiesWithPrice.length / londonActivities.length) * 100)}%)
**Activities with Rating Data:** ${activitiesWithRating.length.toLocaleString()} (${Math.round((activitiesWithRating.length / londonActivities.length) * 100)}%)

### Key Market Metrics

| Metric | Value | Insight |
|--------|-------|---------|
| Average Price | £${Math.round(averagePrice * 100) / 100} | Market benchmark for pricing |
| Average Rating | ${Math.round(averageRating * 10) / 10}/5 | Quality expectation level |
| Price Range | £0 - £1,870 | Market diversity |

## Platform Performance Analysis

### Market Share by Platform

${Object.entries(platformStats).map(([platform, stats]) => `
**${platform.toUpperCase()}**
- Activities: ${stats.count.toLocaleString()} (${Math.round((stats.count / londonActivities.length) * 100)}%)
- Average Price: £${Math.round(stats.avgPrice * 100) / 100}
- Average Rating: ${Math.round(stats.avgRating * 10) / 10}/5
- Price Coverage: ${Math.round((stats.activitiesWithPrice / stats.count) * 100)}%
- Rating Coverage: ${Math.round((stats.activitiesWithRating / stats.count) * 100)}%`).join('\n\n')}

## Competitive Landscape

### Top 10 Providers by Activity Count

| Rank | Provider | Activities | Avg Price | Avg Rating |
|------|----------|------------|-----------|------------|
${topProviders.map((provider, index) => `${index + 1} | ${provider.name} | ${provider.activityCount} | £${Math.round(provider.avgPrice * 100) / 100} | ${Math.round(provider.avgRating * 10) / 10}/5`).join('\n')}

## Quality & Rating Analysis

### Rating Distribution

| Rating Level | Activities | Percentage |
|--------------|------------|------------|
| Excellent (4.5-5.0) | ${ratingDistribution.excellent.toLocaleString()} | ${Math.round((ratingDistribution.excellent / activitiesWithRating.length) * 100)}% |
| Good (4.0-4.4) | ${ratingDistribution.good.toLocaleString()} | ${Math.round((ratingDistribution.good / activitiesWithRating.length) * 100)}% |
| Average (3.5-3.9) | ${ratingDistribution.average.toLocaleString()} | ${Math.round((ratingDistribution.average / activitiesWithRating.length) * 100)}% |
| Poor (<3.5) | ${ratingDistribution.poor.toLocaleString()} | ${Math.round((ratingDistribution.poor / activitiesWithRating.length) * 100)}% |

## Strategic Recommendations

1. **Pricing Strategy**
   - Position new tours around £${Math.round(averagePrice * 100) / 100} for competitive pricing
   - Consider premium positioning for specialized experiences
   - Monitor platform-specific pricing differences

2. **Platform Strategy**
   - Focus on ${Object.entries(platformStats).sort((a, b) => b[1].count - a[1].count)[0][0]} for maximum reach
   - Consider multi-platform presence for broader market coverage
   - Leverage platform-specific pricing advantages

3. **Competitive Positioning**
   - Focus on quality differentiation (target 4.5+ rating)
   - Consider partnerships with established providers
   - Identify gaps in underserved categories

## Methodology

This report analyzes ${londonActivities.length.toLocaleString()} London tourism activities from major online travel platforms, including pricing data from ${activitiesWithPrice.length.toLocaleString()} activities and rating data from ${activitiesWithRating.length.toLocaleString()} activities.

Data sources include:
- GetYourGuide activities
- Viator activities
- Cleaned and quality-scored activity data

---

*Last updated: ${new Date().toLocaleDateString()}*
*Data source: OTA Answers London Tourism Database (Fresh data collected July 2025)*
*Analysis by OTA Answers Market Intelligence Team*`;
}
deployLondonReportToProduction().catch(console.error);
//# sourceMappingURL=deploy-london-report-production.js.map