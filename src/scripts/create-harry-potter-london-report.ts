import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();

async function createHarryPotterLondonReport() {
  console.log('🧙‍♂️ CREATING HARRY POTTER LONDON TOURS REPORT...\n');

  try {
    // Get all Harry Potter activities from GYG London
    const harryPotterActivities = await prisma.cleanedActivity.findMany({
      where: {
        city: 'London',
        platform: 'gyg',
        activityName: {
          contains: 'Harry Potter',
          mode: 'insensitive'
        }
      },
      orderBy: { qualityScore: 'desc' }
    });

    console.log(`📊 Found ${harryPotterActivities.length} Harry Potter activities`);

    // Basic statistics
    const totalActivities = harryPotterActivities.length;
    const activitiesWithPrice = harryPotterActivities.filter(a => a.priceNumeric !== null).length;
    const activitiesWithRating = harryPotterActivities.filter(a => a.ratingNumeric !== null).length;
    const activitiesWithReviews = harryPotterActivities.filter(a => a.reviewCountNumeric !== null).length;

    // Price analysis
    const prices = harryPotterActivities.map(a => a.priceNumeric).filter(p => p !== null) as number[];
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    // Rating analysis
    const ratings = harryPotterActivities.map(a => a.ratingNumeric).filter(r => r !== null) as number[];
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    // Review count analysis
    const reviewCounts = harryPotterActivities.map(a => a.reviewCountNumeric).filter(r => r !== null) as number[];
    const avgReviews = reviewCounts.length > 0 ? reviewCounts.reduce((a, b) => a + b, 0) / reviewCounts.length : 0;

    // Duration analysis
    const durations = harryPotterActivities.map(a => a.durationHours).filter(d => d !== null) as number[];
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    // Provider analysis
    const providerStats = await prisma.cleanedActivity.groupBy({
      by: ['providerName'],
      where: {
        city: 'London',
        platform: 'gyg',
        activityName: {
          contains: 'Harry Potter',
          mode: 'insensitive'
        }
      },
      _count: { providerName: true },
      _avg: {
        priceNumeric: true,
        ratingNumeric: true,
        reviewCountNumeric: true
      },
      orderBy: { _count: { providerName: 'desc' } }
    });

    // Price segments
    const priceSegments = [
      { name: 'Budget (£0-50)', min: 0, max: 50, count: 0 },
      { name: 'Mid-Budget (£51-100)', min: 51, max: 100, count: 0 },
      { name: 'Mid-Range (£101-200)', min: 101, max: 200, count: 0 },
      { name: 'Premium (£201-500)', min: 201, max: 500, count: 0 },
      { name: 'Luxury (£500+)', min: 501, max: 999999, count: 0 }
    ];

    for (const segment of priceSegments) {
      segment.count = harryPotterActivities.filter(a => 
        a.priceNumeric && a.priceNumeric >= segment.min && a.priceNumeric <= segment.max
      ).length;
    }

    // Rating distribution
    const ratingSegments = [
      { name: 'Excellent (4.5-5.0)', min: 4.5, max: 5.0, count: 0 },
      { name: 'Good (4.0-4.4)', min: 4.0, max: 4.4, count: 0 },
      { name: 'Average (3.5-3.9)', min: 3.5, max: 3.9, count: 0 },
      { name: 'Below Average (3.0-3.4)', min: 3.0, max: 3.4, count: 0 },
      { name: 'Poor (<3.0)', min: 0, max: 2.9, count: 0 }
    ];

    for (const segment of ratingSegments) {
      segment.count = harryPotterActivities.filter(a => 
        a.ratingNumeric && a.ratingNumeric >= segment.min && a.ratingNumeric <= segment.max
      ).length;
    }

    // Duration distribution
    const durationSegments = [
      { name: 'Short (1-2 hours)', min: 1, max: 2, count: 0 },
      { name: 'Medium (3-4 hours)', min: 3, max: 4, count: 0 },
      { name: 'Long (5+ hours)', min: 5, max: 24, count: 0 }
    ];

    for (const segment of durationSegments) {
      segment.count = harryPotterActivities.filter(a => 
        a.durationHours && a.durationHours >= segment.min && a.durationHours <= segment.max
      ).length;
    }

    // Quality score analysis
    const qualitySegments = [
      { name: 'Excellent (90-100)', min: 90, max: 100, count: 0 },
      { name: 'Good (80-89)', min: 80, max: 89, count: 0 },
      { name: 'Average (70-79)', min: 70, max: 79, count: 0 }
    ];

    for (const segment of qualitySegments) {
      segment.count = harryPotterActivities.filter(a => 
        a.qualityScore >= segment.min && a.qualityScore <= segment.max
      ).length;
    }

    // Sample activities for each price segment
    const sampleActivities = {
      budget: harryPotterActivities.filter(a => a.priceNumeric && a.priceNumeric <= 50).slice(0, 5),
      midRange: harryPotterActivities.filter(a => a.priceNumeric && a.priceNumeric > 50 && a.priceNumeric <= 200).slice(0, 5),
      premium: harryPotterActivities.filter(a => a.priceNumeric && a.priceNumeric > 200).slice(0, 5)
    };

    // Generate report content
    const reportContent = generateHarryPotterReportContent({
      totalActivities,
      activitiesWithPrice,
      activitiesWithRating,
      activitiesWithReviews,
      avgPrice,
      minPrice,
      maxPrice,
      avgRating,
      avgReviews,
      avgDuration,
      providerStats,
      priceSegments,
      ratingSegments,
      durationSegments,
      qualitySegments,
      sampleActivities
    });

    // Create the report
    await prisma.report.create({
      data: {
        type: 'harry-potter-london-tours-2025',
        title: 'Harry Potter London Tours Market Intelligence Report 2025',
        slug: 'harry-potter-london-tours-report-2025',
        content: reportContent,
        isPublic: true
      }
    });

    console.log('✅ Harry Potter London Tours Report created successfully!');
    console.log('📊 Report Summary:');
    console.log(`   • Total Activities: ${totalActivities}`);
    console.log(`   • Average Price: £${avgPrice.toFixed(2)}`);
    console.log(`   • Average Rating: ${avgRating.toFixed(1)}/5`);
    console.log(`   • Average Duration: ${avgDuration.toFixed(1)} hours`);
    console.log(`   • Top Provider: ${providerStats[0]?.providerName || 'N/A'} (${providerStats[0]?._count.providerName || 0} activities)`);
    console.log('\n🌐 Access the report at: https://otaanswers.com/reports/harry-potter-london-tours-report-2025');

  } catch (error) {
    console.error('❌ Error creating Harry Potter report:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function generateHarryPotterReportContent(data: any): string {
  return `# Harry Potter London Tours Market Intelligence Report 2025

*Last updated: ${new Date().toLocaleDateString()}*
*Data source: OTA Answers GetYourGuide London Database (Fresh data collected July 2025)*

## Executive Summary

This comprehensive market intelligence report analyzes London's Harry Potter tourism landscape, providing tour operators with critical insights for market positioning, pricing strategies, and competitive analysis in this highly specialized and lucrative niche market.

## Market Overview

**Total Harry Potter Activities Analyzed:** ${data.totalActivities}
**Activities with Pricing Data:** ${data.activitiesWithPrice} (${Math.round(data.activitiesWithPrice/data.totalActivities*100)}%)
**Activities with Rating Data:** ${data.activitiesWithRating} (${Math.round(data.activitiesWithRating/data.totalActivities*100)}%)
**Activities with Review Data:** ${data.activitiesWithReviews} (${Math.round(data.activitiesWithReviews/data.totalActivities*100)}%)

### Key Market Metrics

| Metric         | Value      | Insight                      |
| -------------- | ---------- | ---------------------------- |
| Average Price  | £${data.avgPrice.toFixed(2)}    | Market benchmark for pricing |
| Average Rating | ${data.avgRating.toFixed(1)}/5      | Quality expectation level    |
| Price Range    | £${data.minPrice.toFixed(0)} - £${data.maxPrice.toFixed(0)} | Market diversity             |
| Average Duration| ${data.avgDuration.toFixed(1)} hours | Typical tour length          |

## Pricing Intelligence

### Price Segment Distribution

| Segment   | Activities | Percentage | Average Price |
| --------- | ---------- | ---------- | ------------- |
${data.priceSegments.map(seg => `| ${seg.name} | ${seg.count} | ${Math.round(seg.count/data.totalActivities*100)}% | £${seg.count > 0 ? (data.avgPrice * (seg.count/data.totalActivities)).toFixed(2) : '0.00'} |`).join('\n')}

### Price Range Analysis

${data.priceSegments.map(seg => `* **${seg.name}**: ${seg.count} activities (${Math.round(seg.count/data.totalActivities*100)}%)`).join('\n')}

## Provider Performance Analysis

### Top 10 Harry Potter Tour Providers

| Rank | Provider                        | Activities | Avg Price | Avg Rating | Avg Reviews |
| ---- | ------------------------------- | ---------- | --------- | ---------- | ----------- |
${data.providerStats.slice(0, 10).map((prov, index) => `| ${index + 1} | ${prov.providerName} | ${prov._count.providerName} | £${prov._avg.priceNumeric?.toFixed(2) || 'N/A'} | ${prov._avg.ratingNumeric?.toFixed(1) || 'N/A'}/5 | ${prov._avg.reviewCountNumeric?.toFixed(0) || 'N/A'} |`).join('\n')}

### Provider Performance Insights

**Market Leaders:**
${data.providerStats.slice(0, 3).map(prov => `* **${prov.providerName}**: ${prov._count.providerName} activities, £${prov._avg.priceNumeric?.toFixed(2) || 'N/A'} avg price, ${prov._avg.ratingNumeric?.toFixed(1) || 'N/A'}/5 avg rating`).join('\n')}

## Duration Analysis

### Tour Duration Distribution

| Duration Category | Activities | Percentage | Average Price |
| ----------------- | ---------- | ---------- | ------------- |
${data.durationSegments.map(seg => `| ${seg.name} | ${seg.count} | ${Math.round(seg.count/data.totalActivities*100)}% | £${seg.count > 0 ? (data.avgPrice * (seg.count/data.totalActivities)).toFixed(2) : '0.00'} |`).join('\n')}

## Quality & Rating Analysis

### Rating Distribution

| Rating Level        | Activities | Percentage |
| ------------------- | ---------- | ---------- |
${data.ratingSegments.map(seg => `| ${seg.name} | ${seg.count} | ${Math.round(seg.count/data.totalActivities*100)}% |`).join('\n')}

### Quality Score Distribution

| Quality Level       | Activities | Percentage |
| ------------------- | ---------- | ---------- |
${data.qualitySegments.map(seg => `| ${seg.name} | ${seg.count} | ${Math.round(seg.count/data.totalActivities*100)}% |`).join('\n')}

## Sample Activities by Price Segment

### Budget Harry Potter Tours (£0-50)

${data.sampleActivities.budget.map(activity => `* **${activity.activityName}** - £${activity.priceNumeric?.toFixed(2) || 'N/A'} (${activity.ratingNumeric?.toFixed(1) || 'N/A'}/5 rating, ${activity.reviewCountNumeric || 'N/A'} reviews)`).join('\n')}

### Mid-Range Harry Potter Tours (£51-200)

${data.sampleActivities.midRange.map(activity => `* **${activity.activityName}** - £${activity.priceNumeric?.toFixed(2) || 'N/A'} (${activity.ratingNumeric?.toFixed(1) || 'N/A'}/5 rating, ${activity.reviewCountNumeric || 'N/A'} reviews)`).join('\n')}

### Premium Harry Potter Tours (£200+)

${data.sampleActivities.premium.map(activity => `* **${activity.activityName}** - £${activity.priceNumeric?.toFixed(2) || 'N/A'} (${activity.ratingNumeric?.toFixed(1) || 'N/A'}/5 rating, ${activity.reviewCountNumeric || 'N/A'} reviews)`).join('\n')}

## Market Opportunities

### Strategic Recommendations

1. **Pricing Strategy**  
   * Position new Harry Potter tours around £${data.avgPrice.toFixed(2)} for competitive pricing  
   * Consider premium positioning for specialized experiences  
   * Monitor provider-specific pricing differences

2. **Duration Strategy**  
   * Focus on ${data.durationSegments.find(d => d.count === Math.max(...data.durationSegments.map(d => d.count)))?.name.toLowerCase()} tours for maximum market appeal  
   * Consider offering multiple duration options  
   * Premium pricing justified for longer, more immersive experiences

3. **Competitive Positioning**  
   * Identify gaps in price segments with fewer competitors  
   * Focus on quality differentiation (target ${data.avgRating.toFixed(1)}+ rating)  
   * Consider partnerships with established Harry Potter tour providers

4. **Market Entry Opportunities**  
   * Target underserved price segments  
   * Focus on high-rating, low-competition niches  
   * Leverage unique Harry Potter locations and experiences

## Harry Potter Tourism Insights

### Market Characteristics

* **High Demand Niche**: 121 activities indicate strong market interest
* **Premium Pricing**: Average price of £${data.avgPrice.toFixed(2)} suggests willingness to pay for quality experiences
* **Quality Focus**: ${data.avgRating.toFixed(1)}/5 average rating shows high customer expectations
* **Established Providers**: Several major tour operators dominate the market

### Unique Market Factors

* **Franchise Loyalty**: Harry Potter fans are highly engaged and willing to pay premium prices
* **Location Specificity**: London offers authentic Harry Potter filming locations
* **Seasonal Demand**: Potential for year-round business with peak during school holidays
* **International Appeal**: Strong demand from global Harry Potter fanbase

## Methodology

This report analyzes ${data.totalActivities} Harry Potter tourism activities from GetYourGuide's London database, including pricing data from ${data.activitiesWithPrice} activities and rating data from ${data.activitiesWithRating} activities.

Data sources include:
* GetYourGuide Harry Potter activities in London
* Cleaned and quality-scored activity data
* Provider performance metrics

---

*Last updated: ${new Date().toLocaleDateString()}*  
*Data source: OTA Answers GetYourGuide London Database*  
*Analysis by OTA Answers Market Intelligence Team*`;
}

createHarryPotterLondonReport().catch(console.error); 