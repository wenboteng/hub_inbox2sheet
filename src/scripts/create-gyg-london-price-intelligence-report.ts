import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();

async function createGYGLondonPriceIntelligenceReport() {
  console.log('💰 CREATING GETYOURGUIDE LONDON PRICE INTELLIGENCE REPORT...\n');

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

    console.log(`📊 Analyzing ${gygLondonActivities.length} GetYourGuide London activities for price intelligence...`);

    // 1. COMPREHENSIVE PRICING ANALYSIS
    const activitiesWithPrice = gygLondonActivities.filter(a => a.priceNumeric && a.priceNumeric > 0);
    const averagePrice = activitiesWithPrice.length > 0 
      ? activitiesWithPrice.reduce((sum, a) => sum + a.priceNumeric!, 0) / activitiesWithPrice.length 
      : 0;

    // Price distribution analysis
    const sortedPrices = activitiesWithPrice.map(a => a.priceNumeric!).sort((a, b) => a - b);
    const priceQuartiles = {
      q1: sortedPrices[Math.floor(sortedPrices.length * 0.25)],
      q2: sortedPrices[Math.floor(sortedPrices.length * 0.5)],
      q3: sortedPrices[Math.floor(sortedPrices.length * 0.75)],
      q4: sortedPrices[sortedPrices.length - 1]
    };

    // Price segments for market positioning
    const priceSegments = {
      budget: activitiesWithPrice.filter(a => a.priceNumeric! <= priceQuartiles.q1).length,
      value: activitiesWithPrice.filter(a => a.priceNumeric! > priceQuartiles.q1 && a.priceNumeric! <= priceQuartiles.q2).length,
      midRange: activitiesWithPrice.filter(a => a.priceNumeric! > priceQuartiles.q2 && a.priceNumeric! <= priceQuartiles.q3).length,
      premium: activitiesWithPrice.filter(a => a.priceNumeric! > priceQuartiles.q3).length
    };

    // 2. CATEGORY-BASED PRICING ANALYSIS
    const categoryPricing = gygLondonActivities.reduce((acc, activity) => {
      const category = activity.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = {
          name: category,
          count: 0,
          totalPrice: 0,
          activitiesWithPrice: 0,
          totalRating: 0,
          activitiesWithRating: 0,
          totalReviews: 0,
          prices: []
        };
      }
      
      acc[category].count++;
      if (activity.priceNumeric && activity.priceNumeric > 0) {
        acc[category].totalPrice += activity.priceNumeric;
        acc[category].activitiesWithPrice++;
        acc[category].prices.push(activity.priceNumeric);
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

    // Calculate pricing statistics for each category
    Object.keys(categoryPricing).forEach(category => {
      const stats = categoryPricing[category];
      stats.avgPrice = stats.activitiesWithPrice > 0 ? stats.totalPrice / stats.activitiesWithPrice : 0;
      stats.avgRating = stats.activitiesWithRating > 0 ? stats.totalRating / stats.activitiesWithRating : 0;
      stats.avgReviews = stats.count > 0 ? stats.totalReviews / stats.count : 0;
      
      // Calculate price range and standard deviation
      if (stats.prices.length > 0) {
        const sortedPrices = stats.prices.sort((a: number, b: number) => a - b);
        stats.minPrice = sortedPrices[0];
        stats.maxPrice = sortedPrices[sortedPrices.length - 1];
        stats.priceRange = stats.maxPrice - stats.minPrice;
        
        // Calculate median
        const mid = Math.floor(sortedPrices.length / 2);
        stats.medianPrice = sortedPrices.length % 2 === 0 
          ? (sortedPrices[mid - 1] + sortedPrices[mid]) / 2 
          : sortedPrices[mid];
      }
    });

    // 3. PROVIDER PRICING STRATEGY ANALYSIS
    const providerPricing = gygLondonActivities.reduce((acc, activity) => {
      const provider = activity.providerName || 'Unknown';
      if (!acc[provider]) {
        acc[provider] = {
          name: provider,
          activityCount: 0,
          totalPrice: 0,
          activitiesWithPrice: 0,
          totalRating: 0,
          activitiesWithRating: 0,
          totalReviews: 0,
          categories: new Set(),
          prices: [],
          pricingStrategy: 'unknown'
        };
      }
      
      acc[provider].activityCount++;
      if (activity.priceNumeric && activity.priceNumeric > 0) {
        acc[provider].totalPrice += activity.priceNumeric;
        acc[provider].activitiesWithPrice++;
        acc[provider].prices.push(activity.priceNumeric);
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

    // Analyze pricing strategies for each provider
    Object.keys(providerPricing).forEach(provider => {
      const stats = providerPricing[provider];
      stats.avgPrice = stats.activitiesWithPrice > 0 ? stats.totalPrice / stats.activitiesWithPrice : 0;
      stats.avgRating = stats.activitiesWithRating > 0 ? stats.totalRating / stats.activitiesWithRating : 0;
      stats.avgReviews = stats.activityCount > 0 ? stats.totalReviews / stats.activityCount : 0;
      stats.categories = Array.from(stats.categories);
      
      // Determine pricing strategy
      if (stats.avgPrice < averagePrice * 0.8) {
        stats.pricingStrategy = 'budget';
      } else if (stats.avgPrice > averagePrice * 1.2) {
        stats.pricingStrategy = 'premium';
      } else {
        stats.pricingStrategy = 'competitive';
      }
      
      // Calculate price consistency
      if (stats.prices.length > 1) {
        const priceVariance = stats.prices.reduce((sum: number, price: number) => 
          sum + Math.pow(price - stats.avgPrice, 2), 0) / stats.prices.length;
        stats.priceConsistency = Math.sqrt(priceVariance);
        stats.priceConsistencyScore = priceVariance < 100 ? 'high' : priceVariance < 500 ? 'medium' : 'low';
      }
    });

    // 4. DURATION-BASED PRICING ANALYSIS
    const durationPricing = gygLondonActivities.reduce((acc, activity) => {
      const duration = activity.durationHours || 0;
      const durationKey = duration <= 1 ? '1 hour or less' :
                         duration <= 3 ? '2-3 hours' :
                         duration <= 6 ? '4-6 hours' :
                         duration <= 12 ? '7-12 hours' : '12+ hours';
      
      if (!acc[durationKey]) {
        acc[durationKey] = {
          duration: durationKey,
          count: 0,
          totalPrice: 0,
          activitiesWithPrice: 0,
          totalRating: 0,
          activitiesWithRating: 0,
          prices: []
        };
      }
      
      acc[durationKey].count++;
      if (activity.priceNumeric && activity.priceNumeric > 0) {
        acc[durationKey].totalPrice += activity.priceNumeric;
        acc[durationKey].activitiesWithPrice++;
        acc[durationKey].prices.push(activity.priceNumeric);
      }
      if (activity.ratingNumeric && activity.ratingNumeric > 0) {
        acc[durationKey].totalRating += activity.ratingNumeric;
        acc[durationKey].activitiesWithRating++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate duration-based pricing metrics
    Object.keys(durationPricing).forEach(duration => {
      const stats = durationPricing[duration];
      stats.avgPrice = stats.activitiesWithPrice > 0 ? stats.totalPrice / stats.activitiesWithPrice : 0;
      stats.avgRating = stats.activitiesWithRating > 0 ? stats.totalRating / stats.activitiesWithRating : 0;
      
      if (stats.prices.length > 0) {
        const sortedPrices = stats.prices.sort((a: number, b: number) => a - b);
        stats.minPrice = sortedPrices[0];
        stats.maxPrice = sortedPrices[sortedPrices.length - 1];
        stats.priceRange = stats.maxPrice - stats.minPrice;
      }
    });

    // 5. PRICE OPTIMIZATION OPPORTUNITIES
    const priceOptimizationOpportunities = [];
    
    // Find underpriced high-rated activities
    const highRatedActivities = activitiesWithPrice.filter(a => 
      a.ratingNumeric && a.ratingNumeric >= 4.5 && a.priceNumeric! < averagePrice
    );
    
    if (highRatedActivities.length > 0) {
      priceOptimizationOpportunities.push({
        type: 'underpriced_high_rated',
        count: highRatedActivities.length,
        avgPrice: highRatedActivities.reduce((sum, a) => sum + a.priceNumeric!, 0) / highRatedActivities.length,
        avgRating: highRatedActivities.reduce((sum, a) => sum + a.ratingNumeric!, 0) / highRatedActivities.length,
        description: 'High-rated activities priced below market average'
      });
    }

    // Find overpriced low-rated activities
    const overpricedActivities = activitiesWithPrice.filter(a => 
      a.ratingNumeric && a.ratingNumeric < 4.0 && a.priceNumeric! > averagePrice * 1.2
    );
    
    if (overpricedActivities.length > 0) {
      priceOptimizationOpportunities.push({
        type: 'overpriced_low_rated',
        count: overpricedActivities.length,
        avgPrice: overpricedActivities.reduce((sum, a) => sum + a.priceNumeric!, 0) / overpricedActivities.length,
        avgRating: overpricedActivities.reduce((sum, a) => sum + a.ratingNumeric!, 0) / overpricedActivities.length,
        description: 'Low-rated activities priced above market average'
      });
    }

    // 6. COMPETITIVE PRICING INSIGHTS
    const topProviders = Object.values(providerPricing)
      .sort((a: any, b: any) => b.activityCount - a.activityCount)
      .slice(0, 10);

    const competitiveInsights = {
      marketLeaders: topProviders.filter((p: any) => p.pricingStrategy === 'competitive'),
      premiumPlayers: topProviders.filter((p: any) => p.pricingStrategy === 'premium'),
      budgetPlayers: topProviders.filter((p: any) => p.pricingStrategy === 'budget')
    };

    // Prepare data for report
    const data = {
      totalActivities: gygLondonActivities.length,
      activitiesWithPrice: activitiesWithPrice.length,
      activitiesWithRating: gygLondonActivities.filter(a => a.ratingNumeric && a.ratingNumeric > 0).length,
      averagePrice: Math.round(averagePrice * 100) / 100,
      priceQuartiles,
      priceSegments,
      categoryPricing: Object.values(categoryPricing).sort((a: any, b: any) => b.count - a.count),
      providerPricing: Object.values(providerPricing).sort((a: any, b: any) => b.activityCount - a.activityCount),
      durationPricing: Object.values(durationPricing),
      priceOptimizationOpportunities,
      competitiveInsights,
      topProviders
    };

    // Create the report
    const reportContent = generateReportContent(data);
    
    const report = await prisma.report.create({
      data: {
        type: 'gyg-london-price-intelligence',
        title: 'GetYourGuide London Price Intelligence Report 2025',
        slug: 'getyourguide-london-price-intelligence-report-2025',
        content: reportContent,
        isPublic: true
      }
    });

    console.log('✅ GetYourGuide London Price Intelligence Report created successfully!');
    console.log(`📄 Report ID: ${report.id}`);
    console.log(`🔗 Slug: ${report.slug}`);

  } catch (error) {
    console.error('❌ Error creating GetYourGuide London Price Intelligence Report:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function generateReportContent(data: any): string {
  return `# GetYourGuide London Price Intelligence Report 2025

This comprehensive price intelligence report analyzes GetYourGuide's London tourism activity pricing landscape, providing tour operators with detailed insights into pricing strategies, competitive positioning, and optimization opportunities in the London market.

## Executive Summary

**Total GetYourGuide London Activities:** ${data.totalActivities.toLocaleString()}
**Activities with Pricing Data:** ${data.activitiesWithPrice.toLocaleString()} (${Math.round((data.activitiesWithPrice/data.totalActivities)*100)}%)
**Activities with Rating Data:** ${data.activitiesWithRating.toLocaleString()} (${Math.round((data.activitiesWithRating/data.totalActivities)*100)}%)
**Average Price:** £${data.averagePrice}

## Market Pricing Overview

### Price Distribution Analysis

| Price Segment | Count | Percentage | Price Range |
|---------------|-------|------------|-------------|
| Budget (Q1) | ${data.priceSegments.budget} | ${Math.round((data.priceSegments.budget/data.activitiesWithPrice)*100)}% | £0 - £${data.priceQuartiles.q1} |
| Value (Q2) | ${data.priceSegments.value} | ${Math.round((data.priceSegments.value/data.activitiesWithPrice)*100)}% | £${data.priceQuartiles.q1} - £${data.priceQuartiles.q2} |
| Mid-Range (Q3) | ${data.priceSegments.midRange} | ${Math.round((data.priceSegments.midRange/data.activitiesWithPrice)*100)}% | £${data.priceQuartiles.q2} - £${data.priceQuartiles.q3} |
| Premium (Q4) | ${data.priceSegments.premium} | ${Math.round((data.priceSegments.premium/data.activitiesWithPrice)*100)}% | £${data.priceQuartiles.q3}+ |

### Price Quartiles
- **Q1 (25th percentile):** £${data.priceQuartiles.q1}
- **Q2 (Median):** £${data.priceQuartiles.q2}
- **Q3 (75th percentile):** £${data.priceQuartiles.q3}
- **Q4 (Maximum):** £${data.priceQuartiles.q4}

## Category-Based Pricing Analysis

### Top Categories by Activity Count

${data.categoryPricing.slice(0, 10).map((cat: any) => `
#### ${cat.name}
- **Activities:** ${cat.count}
- **Average Price:** £${Math.round(cat.avgPrice * 100) / 100}
- **Median Price:** £${Math.round(cat.medianPrice * 100) / 100}
- **Price Range:** £${cat.minPrice} - £${cat.maxPrice}
- **Average Rating:** ${cat.avgRating ? cat.avgRating.toFixed(1) : 'N/A'}/5.0
- **Average Reviews:** ${Math.round(cat.avgReviews)}`).join('\n')}

## Duration-Based Pricing Insights

${data.durationPricing.map((duration: any) => `
### ${duration.duration}
- **Activities:** ${duration.count}
- **Average Price:** £${Math.round(duration.avgPrice * 100) / 100}
- **Price Range:** £${duration.minPrice} - £${duration.maxPrice}
- **Average Rating:** ${duration.avgRating ? duration.avgRating.toFixed(1) : 'N/A'}/5.0`).join('\n')}

## Provider Pricing Strategy Analysis

### Top 10 Providers by Activity Count

${data.topProviders.map((provider: any, index: number) => `
#### ${index + 1}. ${provider.name}
- **Activities:** ${provider.activityCount}
- **Average Price:** £${Math.round(provider.avgPrice * 100) / 100}
- **Pricing Strategy:** ${provider.pricingStrategy.charAt(0).toUpperCase() + provider.pricingStrategy.slice(1)}
- **Price Consistency:** ${provider.priceConsistencyScore ? provider.priceConsistencyScore.charAt(0).toUpperCase() + provider.priceConsistencyScore.slice(1) : 'N/A'}
- **Average Rating:** ${provider.avgRating ? provider.avgRating.toFixed(1) : 'N/A'}/5.0
- **Categories:** ${provider.categories.slice(0, 3).join(', ')}${provider.categories.length > 3 ? '...' : ''}`).join('\n')}

### Pricing Strategy Distribution

| Strategy | Providers | Average Price | Market Position |
|----------|-----------|---------------|-----------------|
| Competitive | ${data.competitiveInsights.marketLeaders.length} | £${data.competitiveInsights.marketLeaders.length > 0 ? Math.round(data.competitiveInsights.marketLeaders.reduce((sum: number, p: any) => sum + p.avgPrice, 0) / data.competitiveInsights.marketLeaders.length * 100) / 100 : 0} | Market average |
| Premium | ${data.competitiveInsights.premiumPlayers.length} | £${data.competitiveInsights.premiumPlayers.length > 0 ? Math.round(data.competitiveInsights.premiumPlayers.reduce((sum: number, p: any) => sum + p.avgPrice, 0) / data.competitiveInsights.premiumPlayers.length * 100) / 100 : 0} | Above market |
| Budget | ${data.competitiveInsights.budgetPlayers.length} | £${data.competitiveInsights.budgetPlayers.length > 0 ? Math.round(data.competitiveInsights.budgetPlayers.reduce((sum: number, p: any) => sum + p.avgPrice, 0) / data.competitiveInsights.budgetPlayers.length * 100) / 100 : 0} | Below market |

## Price Optimization Opportunities

### High-Rated, Underpriced Activities
${data.priceOptimizationOpportunities.find((opp: any) => opp.type === 'underpriced_high_rated') ? `
- **Count:** ${data.priceOptimizationOpportunities.find((opp: any) => opp.type === 'underpriced_high_rated')?.count}
- **Average Price:** £${Math.round((data.priceOptimizationOpportunities.find((opp: any) => opp.type === 'underpriced_high_rated')?.avgPrice || 0) * 100) / 100}
- **Average Rating:** ${data.priceOptimizationOpportunities.find((opp: any) => opp.type === 'underpriced_high_rated')?.avgRating.toFixed(1)}/5.0
- **Opportunity:** These activities could potentially command higher prices given their high ratings` : 'No significant opportunities found'}

### Overpriced, Low-Rated Activities
${data.priceOptimizationOpportunities.find((opp: any) => opp.type === 'overpriced_low_rated') ? `
- **Count:** ${data.priceOptimizationOpportunities.find((opp: any) => opp.type === 'overpriced_low_rated')?.count}
- **Average Price:** £${Math.round((data.priceOptimizationOpportunities.find((opp: any) => opp.type === 'overpriced_low_rated')?.avgPrice || 0) * 100) / 100}
- **Average Rating:** ${data.priceOptimizationOpportunities.find((opp: any) => opp.type === 'overpriced_low_rated')?.avgRating.toFixed(1)}/5.0
- **Risk:** These activities may need price adjustments to improve competitiveness` : 'No significant risks identified'}

## Strategic Recommendations

### For Tour Operators

1. **Price Positioning Strategy**
   - Analyze your current pricing against the market quartiles
   - Consider moving to a more competitive price point if below Q2
   - Premium positioning requires exceptional quality and ratings

2. **Category-Specific Pricing**
   - Research category-specific pricing benchmarks
   - Identify underserved price segments within your category
   - Consider duration-based pricing optimization

3. **Competitive Monitoring**
   - Track pricing strategies of top providers in your category
   - Monitor price consistency and market positioning
   - Identify pricing gaps and opportunities

4. **Quality-Price Optimization**
   - High-rated activities can command premium prices
   - Low-rated activities may need price adjustments
   - Focus on improving quality to justify higher pricing

### For Market Entry

1. **Price Segment Analysis**
   - Budget segment: £0 - £${data.priceQuartiles.q1}
   - Value segment: £${data.priceQuartiles.q1} - £${data.priceQuartiles.q2}
   - Mid-range segment: £${data.priceQuartiles.q2} - £${data.priceQuartiles.q3}
   - Premium segment: £${data.priceQuartiles.q3}+

2. **Competitive Positioning**
   - Identify gaps in current pricing strategies
   - Consider underserved duration categories
   - Analyze provider pricing consistency for opportunities

## Methodology

This report analyzes ${data.totalActivities.toLocaleString()} GetYourGuide London tourism activities, including pricing data from ${data.activitiesWithPrice.toLocaleString()} activities, rating data from ${data.activitiesWithRating.toLocaleString()} activities, and duration data from activities with available information.

**Data Sources:**
- GetYourGuide London activities database
- Real-time pricing and rating data
- Provider and category analysis
- Duration-based pricing insights

**Analysis Period:** July 2025
**Last Updated:** ${new Date().toLocaleDateString()}

---

*Data source: OTA Answers GetYourGuide London Database (Fresh data collected July 2025)*
*Analysis by OTA Answers Price Intelligence Team*
*For tour operators and market analysts*`;
}

// Run the script
createGYGLondonPriceIntelligenceReport(); 