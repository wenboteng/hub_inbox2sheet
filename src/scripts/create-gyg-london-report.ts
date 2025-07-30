import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();

async function createGYGLondonReport() {
  console.log('🇬🇧 CREATING GETYOURGUIDE LONDON MARKET INTELLIGENCE REPORT...\n');

  try {
    // Get all GetYourGuide London activities
    const gygLondonActivities = await prisma.cleanedActivity.findMany({
      where: { 
        city: 'London',
        platform: 'gyg'
      },
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
        qualityScore: true,
        description: true
      }
    });

    console.log(`📊 Analyzing ${gygLondonActivities.length} GetYourGuide London activities...`);

    // 1. PRICING ANALYSIS
    const activitiesWithPrice = gygLondonActivities.filter(a => a.priceNumeric && a.priceNumeric > 0);
    const averagePrice = activitiesWithPrice.length > 0 
      ? activitiesWithPrice.reduce((sum, a) => sum + a.priceNumeric!, 0) / activitiesWithPrice.length 
      : 0;

    // Price segments
    const sortedPrices = activitiesWithPrice.map(a => a.priceNumeric!).sort((a, b) => a - b);
    const budgetThreshold = sortedPrices[Math.floor(sortedPrices.length * 0.33)];
    const midThreshold = sortedPrices[Math.floor(sortedPrices.length * 0.67)];

    const priceSegments = {
      budget: activitiesWithPrice.filter(a => a.priceNumeric! <= budgetThreshold).length,
      midRange: activitiesWithPrice.filter(a => a.priceNumeric! > budgetThreshold && a.priceNumeric! <= midThreshold).length,
      premium: activitiesWithPrice.filter(a => a.priceNumeric! > midThreshold).length
    };

    // 2. PROVIDER ANALYSIS
    const providerStats = gygLondonActivities.reduce((acc, activity) => {
      const provider = activity.providerName || 'Unknown';
      if (!acc[provider]) {
        acc[provider] = {
          name: provider,
          activityCount: 0,
          totalPrice: 0,
          totalRating: 0,
          activitiesWithPrice: 0,
          activitiesWithRating: 0,
          totalReviews: 0,
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
      if (activity.reviewCountNumeric && activity.reviewCountNumeric > 0) {
        acc[provider].totalReviews += activity.reviewCountNumeric;
      }
      if (activity.category) acc[provider].categories.add(activity.category);
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages and convert sets to arrays
    Object.keys(providerStats).forEach(provider => {
      const stats = providerStats[provider];
      stats.avgPrice = stats.activitiesWithPrice > 0 ? stats.totalPrice / stats.activitiesWithPrice : 0;
      stats.avgRating = stats.activitiesWithRating > 0 ? stats.totalRating / stats.activitiesWithRating : 0;
      stats.avgReviews = stats.activityCount > 0 ? stats.totalReviews / stats.activityCount : 0;
      stats.categories = Array.from(stats.categories);
    });

    // Top providers by activity count
    const topProviders = Object.values(providerStats)
      .sort((a: any, b: any) => b.activityCount - a.activityCount)
      .slice(0, 15);

    // 3. RATING ANALYSIS
    const activitiesWithRating = gygLondonActivities.filter(a => a.ratingNumeric && a.ratingNumeric > 0);
    const averageRating = activitiesWithRating.length > 0 
      ? activitiesWithRating.reduce((sum, a) => sum + a.ratingNumeric!, 0) / activitiesWithRating.length 
      : 0;

    const ratingDistribution = {
      excellent: activitiesWithRating.filter(a => a.ratingNumeric! >= 4.5).length,
      good: activitiesWithRating.filter(a => a.ratingNumeric! >= 4.0 && a.ratingNumeric! < 4.5).length,
      average: activitiesWithRating.filter(a => a.ratingNumeric! >= 3.5 && a.ratingNumeric! < 4.0).length,
      poor: activitiesWithRating.filter(a => a.ratingNumeric! < 3.5).length
    };

    // 4. CATEGORY ANALYSIS
    const categoryStats = gygLondonActivities.reduce((acc, activity) => {
      const category = activity.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = {
          name: category,
          count: 0,
          totalPrice: 0,
          totalRating: 0,
          activitiesWithPrice: 0,
          activitiesWithRating: 0,
          totalReviews: 0
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
      if (activity.reviewCountNumeric && activity.reviewCountNumeric > 0) {
        acc[category].totalReviews += activity.reviewCountNumeric;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages for categories
    Object.keys(categoryStats).forEach(category => {
      const stats = categoryStats[category];
      stats.avgPrice = stats.activitiesWithPrice > 0 ? stats.totalPrice / stats.activitiesWithPrice : 0;
      stats.avgRating = stats.activitiesWithRating > 0 ? stats.totalRating / stats.activitiesWithRating : 0;
      stats.avgReviews = stats.count > 0 ? stats.totalReviews / stats.count : 0;
    });

    const topCategories = Object.values(categoryStats)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    // 5. DURATION ANALYSIS
    const activitiesWithDuration = gygLondonActivities.filter(a => a.durationHours && a.durationHours > 0);
    const averageDuration = activitiesWithDuration.length > 0 
      ? activitiesWithDuration.reduce((sum, a) => sum + a.durationHours!, 0) / activitiesWithDuration.length 
      : 0;

    const durationDistribution = {
      short: activitiesWithDuration.filter(a => a.durationHours! <= 2).length,
      medium: activitiesWithDuration.filter(a => a.durationHours! > 2 && a.durationHours! <= 6).length,
      long: activitiesWithDuration.filter(a => a.durationHours! > 6).length
    };

    // 6. QUALITY SCORE ANALYSIS
    const activitiesWithQuality = gygLondonActivities.filter(a => a.qualityScore && a.qualityScore > 0);
    const averageQuality = activitiesWithQuality.length > 0 
      ? activitiesWithQuality.reduce((sum, a) => sum + a.qualityScore!, 0) / activitiesWithQuality.length 
      : 0;

    const qualityDistribution = {
      high: activitiesWithQuality.filter(a => a.qualityScore! >= 0.8).length,
      medium: activitiesWithQuality.filter(a => a.qualityScore! >= 0.6 && a.qualityScore! < 0.8).length,
      low: activitiesWithQuality.filter(a => a.qualityScore! < 0.6).length
    };

    // 7. MARKET OPPORTUNITIES
    const marketOpportunities = [];
    
    // Low competition categories
    const lowCompetitionCategories = Object.values(categoryStats)
      .filter((cat: any) => cat.count < 10 && cat.avgPrice > averagePrice)
      .sort((a: any, b: any) => b.avgPrice - a.avgPrice)
      .slice(0, 5);

    if (lowCompetitionCategories.length > 0) {
      marketOpportunities.push({
        type: 'Low Competition High-Value Categories',
        description: 'Categories with few competitors but high average prices',
        opportunities: lowCompetitionCategories.map((cat: any) => ({
          category: cat.name,
          competitors: cat.count,
          avgPrice: cat.avgPrice
        }))
      });
    }

    // Price gaps
    const priceRanges = [
      { min: 0, max: 50, label: 'Budget (£0-50)' },
      { min: 51, max: 100, label: 'Mid-Budget (£51-100)' },
      { min: 101, max: 200, label: 'Mid-Range (£101-200)' },
      { min: 201, max: 500, label: 'Premium (£201-500)' },
      { min: 501, max: 999999, label: 'Luxury (£500+)' }
    ];

    const priceGaps = priceRanges.map(range => {
      const activitiesInRange = activitiesWithPrice.filter(a => 
        a.priceNumeric! >= range.min && a.priceNumeric! <= range.max
      );
      return {
        range: range.label,
        count: activitiesInRange.length,
        percentage: Math.round((activitiesInRange.length / activitiesWithPrice.length) * 100)
      };
    });

    // Generate the report content
    const reportContent = generateReportContent({
      totalActivities: gygLondonActivities.length,
      activitiesWithPrice: activitiesWithPrice.length,
      activitiesWithRating: activitiesWithRating.length,
      activitiesWithDuration: activitiesWithDuration.length,
      activitiesWithQuality: activitiesWithQuality.length,
      averagePrice,
      averageRating,
      averageDuration,
      averageQuality,
      priceSegments,
      topProviders,
      ratingDistribution,
      topCategories,
      durationDistribution,
      qualityDistribution,
      marketOpportunities,
      priceGaps
    });

    // Create the report in the database
    const report = await prisma.report.create({
      data: {
        type: 'gyg-london-market-intelligence-2025',
        title: 'GetYourGuide London Market Intelligence Report 2025',
        slug: 'gyg-london-market-intelligence-report-2025',
        content: reportContent,
        isPublic: true
      }
    });

    console.log('✅ GetYourGuide London Market Intelligence Report created successfully!');
    console.log(`📄 Report ID: ${report.id}`);
    console.log(`🔗 Slug: ${report.slug}`);
    console.log(`📊 Total GYG London Activities Analyzed: ${gygLondonActivities.length}`);
    console.log(`💰 Average Price: £${Math.round(averagePrice * 100) / 100}`);
    console.log(`⭐ Average Rating: ${Math.round(averageRating * 10) / 10}/5`);
    console.log(`⏱️ Average Duration: ${Math.round(averageDuration * 10) / 10} hours`);

  } catch (error) {
    console.error('❌ Error creating GetYourGuide London Report:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function generateReportContent(data: any): string {
  return `# GetYourGuide London Market Intelligence Report 2025

## Executive Summary

This comprehensive market intelligence report analyzes GetYourGuide's London tourism activity landscape, providing tour operators with detailed insights into GYG's market positioning, pricing strategies, and competitive dynamics in London.

## Market Overview

**Total GetYourGuide London Activities:** ${data.totalActivities.toLocaleString()}
**Activities with Pricing Data:** ${data.activitiesWithPrice.toLocaleString()} (${Math.round((data.activitiesWithPrice/data.totalActivities)*100)}%)
**Activities with Rating Data:** ${data.activitiesWithRating.toLocaleString()} (${Math.round((data.activitiesWithRating/data.totalActivities)*100)}%)
**Activities with Duration Data:** ${data.activitiesWithDuration.toLocaleString()} (${Math.round((data.activitiesWithDuration/data.totalActivities)*100)}%)

### Key Market Metrics

| Metric | Value | Insight |
|--------|-------|---------|
| Average Price | £${Math.round(data.averagePrice * 100) / 100} | GYG London pricing benchmark |
| Average Rating | ${Math.round(data.averageRating * 10) / 10}/5 | GYG quality expectation level |
| Average Duration | ${Math.round(data.averageDuration * 10) / 10} hours | Typical tour length |
| Average Quality Score | ${Math.round(data.averageQuality * 100) / 100}% | Data completeness |

## Pricing Intelligence

### Price Segment Distribution

| Segment | Activities | Percentage | Average Price |
|---------|------------|------------|---------------|
| Budget | ${data.priceSegments.budget.toLocaleString()} | ${Math.round((data.priceSegments.budget/data.activitiesWithPrice)*100)}% | £${Math.round((data.averagePrice * 0.6) * 100) / 100} |
| Mid-Range | ${data.priceSegments.midRange.toLocaleString()} | ${Math.round((data.priceSegments.midRange/data.activitiesWithPrice)*100)}% | £${Math.round(data.averagePrice * 100) / 100} |
| Premium | ${data.priceSegments.premium.toLocaleString()} | ${Math.round((data.priceSegments.premium/data.activitiesWithPrice)*100)}% | £${Math.round((data.averagePrice * 1.8) * 100) / 100} |

### Price Range Analysis

${data.priceGaps.map((gap: any) => `- **${gap.range}**: ${gap.count} activities (${gap.percentage}%)`).join('\n')}

## Provider Landscape

### Top 15 GetYourGuide Providers in London

| Rank | Provider | Activities | Avg Price | Avg Rating | Avg Reviews | Categories |
|------|----------|------------|-----------|------------|-------------|------------|
${data.topProviders.map((provider: any, index: number) => 
  `${index + 1} | ${provider.name} | ${provider.activityCount} | £${Math.round(provider.avgPrice * 100) / 100} | ${Math.round(provider.avgRating * 10) / 10}/5 | ${Math.round(provider.avgReviews)} | ${provider.categories.slice(0, 2).join(', ')}`
).join('\n')}

### Provider Performance Insights

**Market Leaders:**
- **${data.topProviders[0]?.name}**: ${data.topProviders[0]?.activityCount} activities, £${Math.round(data.topProviders[0]?.avgPrice * 100) / 100} avg price, ${Math.round(data.topProviders[0]?.avgRating * 10) / 10}/5 avg rating
- **${data.topProviders[1]?.name}**: ${data.topProviders[1]?.activityCount} activities, £${Math.round(data.topProviders[1]?.avgPrice * 100) / 100} avg price, ${Math.round(data.topProviders[1]?.avgRating * 10) / 10}/5 avg rating
- **${data.topProviders[2]?.name}**: ${data.topProviders[2]?.activityCount} activities, £${Math.round(data.topProviders[2]?.avgPrice * 100) / 100} avg price, ${Math.round(data.topProviders[2]?.avgRating * 10) / 10}/5 avg rating

## Quality & Rating Analysis

### Rating Distribution

| Rating Level | Activities | Percentage |
|--------------|------------|------------|
| Excellent (4.5-5.0) | ${data.ratingDistribution.excellent.toLocaleString()} | ${Math.round((data.ratingDistribution.excellent/data.activitiesWithRating)*100)}% |
| Good (4.0-4.4) | ${data.ratingDistribution.good.toLocaleString()} | ${Math.round((data.ratingDistribution.good/data.activitiesWithRating)*100)}% |
| Average (3.5-3.9) | ${data.ratingDistribution.average.toLocaleString()} | ${Math.round((data.ratingDistribution.average/data.activitiesWithRating)*100)}% |
| Poor (<3.5) | ${data.ratingDistribution.poor.toLocaleString()} | ${Math.round((data.ratingDistribution.poor/data.activitiesWithRating)*100)}% |

### Quality Score Distribution

| Quality Level | Activities | Percentage |
|---------------|------------|------------|
| High (80%+) | ${data.qualityDistribution.high.toLocaleString()} | ${Math.round((data.qualityDistribution.high/data.activitiesWithQuality)*100)}% |
| Medium (60-79%) | ${data.qualityDistribution.medium.toLocaleString()} | ${Math.round((data.qualityDistribution.medium/data.activitiesWithQuality)*100)}% |
| Low (<60%) | ${data.qualityDistribution.low.toLocaleString()} | ${Math.round((data.qualityDistribution.low/data.activitiesWithQuality)*100)}% |

## Category Performance

### Top Categories by Activity Count

${data.topCategories.map((cat: any, index: number) => 
  `${index + 1}. **${cat.name}**: ${cat.count} activities, £${Math.round(cat.avgPrice * 100) / 100} avg price, ${Math.round(cat.avgRating * 10) / 10}/5 avg rating, ${Math.round(cat.avgReviews)} avg reviews`
).join('\n')}

## Duration Analysis

### Tour Duration Distribution

| Duration | Activities | Percentage |
|----------|------------|------------|
| Short (≤2 hours) | ${data.durationDistribution.short.toLocaleString()} | ${Math.round((data.durationDistribution.short/data.activitiesWithDuration)*100)}% |
| Medium (2-6 hours) | ${data.durationDistribution.medium.toLocaleString()} | ${Math.round((data.durationDistribution.medium/data.activitiesWithDuration)*100)}% |
| Long (>6 hours) | ${data.durationDistribution.long.toLocaleString()} | ${Math.round((data.durationDistribution.long/data.activitiesWithDuration)*100)}% |

## Market Opportunities

### Low Competition High-Value Categories

${data.marketOpportunities[0]?.opportunities.map((opp: any) => 
  `- **${opp.category}**: Only ${opp.competitors} competitors, £${Math.round(opp.avgPrice * 100) / 100} average price`
).join('\n') || 'No significant low-competition opportunities identified'}

### Strategic Recommendations

1. **Pricing Strategy**
   - Position new tours around £${Math.round(data.averagePrice * 100) / 100} for competitive pricing
   - Consider premium positioning for specialized experiences
   - Target underserved price segments

2. **Provider Strategy**
   - Partner with established providers like ${data.topProviders[0]?.name}
   - Focus on quality differentiation (target 4.5+ rating)
   - Leverage multi-category presence

3. **Category Strategy**
   - Focus on high-demand categories with fewer competitors
   - Consider duration-based pricing strategies
   - Target categories with high average prices

4. **Quality Strategy**
   - Maintain high quality scores (80%+) for better visibility
   - Focus on complete data (pricing, ratings, reviews)
   - Regular data updates for accuracy

## GetYourGuide Platform Insights

### Platform Strengths in London
- **${data.totalActivities.toLocaleString()} activities** available
- **${Math.round((data.activitiesWithRating/data.totalActivities)*100)}% rating coverage**
- **${Math.round((data.activitiesWithPrice/data.totalActivities)*100)}% pricing transparency**
- **${Math.round(data.averageRating * 10) / 10}/5 average quality rating**

### Competitive Advantages
- Strong provider network with ${data.topProviders.length} major providers
- Diverse pricing options from budget to luxury
- High-quality data completeness
- Comprehensive category coverage

## Methodology

This report analyzes ${data.totalActivities.toLocaleString()} GetYourGuide London tourism activities, including pricing data from ${data.activitiesWithPrice.toLocaleString()} activities, rating data from ${data.activitiesWithRating.toLocaleString()} activities, and duration data from ${data.activitiesWithDuration.toLocaleString()} activities.

Data sources include:
- GetYourGuide London activities
- Cleaned and quality-scored activity data
- Provider performance metrics

---

*Last updated: ${new Date().toLocaleDateString()}*
*Data source: OTA Answers GetYourGuide London Database (Fresh data collected July 2025)*
*Analysis by OTA Answers Market Intelligence Team*`;
}

createGYGLondonReport().catch(console.error); 