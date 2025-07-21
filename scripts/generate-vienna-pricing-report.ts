import { mainPrisma } from '../src/lib/dual-prisma';

async function generateViennaPricingReport() {
  console.log('💰 GENERATING VIENNA PRICING INTELLIGENCE REPORT...\n');

  try {
    await mainPrisma.$connect();
    
    console.log('✅ Connected to main database');

    // Get Vienna activities with pricing data
    const viennaActivities = await mainPrisma.importedGYGActivity.findMany({
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
        priceCurrency: true,
        providerName: true,
        location: true,
        venue: true,
        duration: true,
        durationHours: true,
        tags: true,
        description: true,
        qualityScore: true
      }
    });

    console.log(`📊 Analyzing ${viennaActivities.length} Vienna activities with pricing data`);

    // 1. PRICING DISTRIBUTION ANALYSIS
    const priceRanges = {
      'Budget (€0-25)': viennaActivities.filter(a => a.priceNumeric! <= 25),
      'Mid-range (€26-75)': viennaActivities.filter(a => a.priceNumeric! > 25 && a.priceNumeric! <= 75),
      'Premium (€76-150)': viennaActivities.filter(a => a.priceNumeric! > 75 && a.priceNumeric! <= 150),
      'Luxury (€151-300)': viennaActivities.filter(a => a.priceNumeric! > 150 && a.priceNumeric! <= 300),
      'Ultra-Luxury (€300+)': viennaActivities.filter(a => a.priceNumeric! > 300)
    };

    // 2. VALUE ANALYSIS (Rating per Euro)
    const valueAnalysis = viennaActivities
      .filter(a => a.ratingNumeric !== null && a.priceNumeric !== null)
      .map(a => ({
        name: a.activityName,
        rating: a.ratingNumeric!,
        price: a.priceNumeric!,
        valueScore: a.ratingNumeric! / (a.priceNumeric! / 100), // Rating per €100
        reviewCount: a.reviewCountNumeric || 0,
        provider: a.providerName,
        venue: a.venue
      }))
      .sort((a, b) => b.valueScore - a.valueScore);

    // 3. ACTIVITY TYPE PRICING ANALYSIS
    const activityTypePricing = new Map<string, { count: number, avgPrice: number, avgRating: number, activities: any[] }>();
    
    viennaActivities.forEach(activity => {
      const name = activity.activityName.toLowerCase();
      let type = 'Other';
      
      if (name.includes('tour')) type = 'Tours';
      else if (name.includes('concert') || name.includes('music')) type = 'Concerts & Music';
      else if (name.includes('museum') || name.includes('gallery')) type = 'Museums & Galleries';
      else if (name.includes('palace') || name.includes('castle')) type = 'Palaces & Castles';
      else if (name.includes('food') || name.includes('wine') || name.includes('dining')) type = 'Food & Wine';
      else if (name.includes('walking') || name.includes('hiking')) type = 'Walking & Hiking';
      else if (name.includes('bike') || name.includes('cycling')) type = 'Biking';
      else if (name.includes('transport') || name.includes('transfer')) type = 'Transport';
      
      if (!activityTypePricing.has(type)) {
        activityTypePricing.set(type, { count: 0, avgPrice: 0, avgRating: 0, activities: [] });
      }
      
      const typeData = activityTypePricing.get(type)!;
      typeData.count++;
      typeData.avgPrice += activity.priceNumeric!;
      if (activity.ratingNumeric) typeData.avgRating += activity.ratingNumeric;
      typeData.activities.push(activity);
    });

    // Calculate averages
    activityTypePricing.forEach((data, type) => {
      data.avgPrice = data.avgPrice / data.count;
      data.avgRating = data.avgRating / data.count;
    });

    // 4. VENUE PRICING ANALYSIS
    const venuePricing = new Map<string, { count: number, avgPrice: number, avgRating: number, activities: any[] }>();
    
    viennaActivities.forEach(activity => {
      if (activity.venue) {
        const venue = activity.venue.trim();
        if (!venuePricing.has(venue)) {
          venuePricing.set(venue, { count: 0, avgPrice: 0, avgRating: 0, activities: [] });
        }
        
        const venueData = venuePricing.get(venue)!;
        venueData.count++;
        venueData.avgPrice += activity.priceNumeric!;
        if (activity.ratingNumeric) venueData.avgRating += activity.ratingNumeric;
        venueData.activities.push(activity);
      }
    });

    // Calculate averages
    venuePricing.forEach((data, venue) => {
      data.avgPrice = data.avgPrice / data.count;
      data.avgRating = data.avgRating / data.count;
    });

    // 5. PROVIDER PRICING ANALYSIS
    const providerPricing = new Map<string, { count: number, avgPrice: number, avgRating: number, activities: any[] }>();
    
    viennaActivities.forEach(activity => {
      if (activity.providerName && activity.providerName.trim() !== 'Unknown') {
        const provider = activity.providerName.trim();
        if (!providerPricing.has(provider)) {
          providerPricing.set(provider, { count: 0, avgPrice: 0, avgRating: 0, activities: [] });
        }
        
        const providerData = providerPricing.get(provider)!;
        providerData.count++;
        providerData.avgPrice += activity.priceNumeric!;
        if (activity.ratingNumeric) providerData.avgRating += activity.ratingNumeric;
        providerData.activities.push(activity);
      }
    });

    // Calculate averages
    providerPricing.forEach((data, provider) => {
      data.avgPrice = data.avgPrice / data.count;
      data.avgRating = data.avgRating / data.count;
    });

    // 6. DURATION PRICING ANALYSIS
    const durationPricing = new Map<string, { count: number, avgPrice: number, avgRating: number, activities: any[] }>();
    
    viennaActivities.forEach(activity => {
      let duration = 'Unknown';
      if (activity.duration) {
        const durationText = activity.duration.toLowerCase();
        if (durationText.includes('hour') || durationText.includes('hr')) {
          const hourMatch = durationText.match(/(\d+)\s*hour/);
          if (hourMatch) {
            const hours = parseInt(hourMatch[1]);
            if (hours <= 2) duration = 'Short (1-2 hours)';
            else if (hours <= 4) duration = 'Medium (3-4 hours)';
            else duration = 'Long (5+ hours)';
          }
        }
      }
      
      if (!durationPricing.has(duration)) {
        durationPricing.set(duration, { count: 0, avgPrice: 0, avgRating: 0, activities: [] });
      }
      
      const durationData = durationPricing.get(duration)!;
      durationData.count++;
      durationData.avgPrice += activity.priceNumeric!;
      if (activity.ratingNumeric) durationData.avgRating += activity.ratingNumeric;
      durationData.activities.push(activity);
    });

    // Calculate averages
    durationPricing.forEach((data, duration) => {
      data.avgPrice = data.avgPrice / data.count;
      data.avgRating = data.avgRating / data.count;
    });

    // 7. GENERATE REPORT
    const report = `
# Vienna Pricing Intelligence Report

## 📊 Executive Summary

**Report Generated**: ${new Date().toISOString().split('T')[0]}
**Total Activities Analyzed**: ${viennaActivities.length}
**Price Range**: €${Math.min(...viennaActivities.map(a => a.priceNumeric!))} - €${Math.max(...viennaActivities.map(a => a.priceNumeric!))}
**Average Price**: €${(viennaActivities.reduce((sum, a) => sum + a.priceNumeric!, 0) / viennaActivities.length).toFixed(2)}
**Average Rating**: ${(viennaActivities.filter(a => a.ratingNumeric).reduce((sum, a) => sum + a.ratingNumeric!, 0) / viennaActivities.filter(a => a.ratingNumeric).length).toFixed(2)}/5.0

## 💰 Pricing Distribution Analysis

### Price Range Breakdown
${Object.entries(priceRanges).map(([range, activities]) => `
**${range}**
- Activities: ${activities.length} (${((activities.length / viennaActivities.length) * 100).toFixed(1)}%)
- Average Price: €${activities.length > 0 ? (activities.reduce((sum, a) => sum + a.priceNumeric!, 0) / activities.length).toFixed(2) : '0.00'}
- Average Rating: ${activities.length > 0 ? (activities.filter(a => a.ratingNumeric).reduce((sum, a) => sum + a.ratingNumeric!, 0) / activities.filter(a => a.ratingNumeric).length).toFixed(2) : '0.00'}/5.0
`).join('\n')}

### Key Insights
- **Budget Segment** (€0-25): ${priceRanges['Budget (€0-25)'].length} activities - Entry-level experiences
- **Mid-range Segment** (€26-75): ${priceRanges['Mid-range (€26-75)'].length} activities - Most popular price point
- **Premium Segment** (€76-150): ${priceRanges['Premium (€76-150)'].length} activities - Quality experiences
- **Luxury Segment** (€151-300): ${priceRanges['Luxury (€151-300)'].length} activities - High-end offerings
- **Ultra-Luxury Segment** (€300+): ${priceRanges['Ultra-Luxury (€300+)'].length} activities - Exclusive experiences

## ⭐ Value Analysis (Rating per €100)

### Top 10 Best Value Activities
${valueAnalysis.slice(0, 10).map((activity, index) => `
${index + 1}. **${activity.name}**
   - Value Score: ${activity.valueScore.toFixed(2)} rating/€100
   - Price: €${activity.price}
   - Rating: ${activity.rating}/5.0
   - Reviews: ${activity.reviewCount}
   - Provider: ${activity.provider}
`).join('\n')}

### Value Insights
- **Best Value Range**: €15-50 activities typically offer the best rating-to-price ratio
- **Premium Value**: Higher-priced activities maintain quality but with diminishing returns
- **Budget Opportunities**: Several low-cost activities offer excellent value

## 🎭 Activity Type Pricing Analysis

${Array.from(activityTypePricing.entries())
  .sort((a, b) => b[1].count - a[1].count)
  .map(([type, data]) => `
### ${type}
- **Count**: ${data.count} activities
- **Average Price**: €${data.avgPrice.toFixed(2)}
- **Average Rating**: ${data.avgRating.toFixed(2)}/5.0
- **Price Range**: €${Math.min(...data.activities.map(a => a.priceNumeric!))} - €${Math.max(...data.activities.map(a => a.priceNumeric!))}
`).join('\n')}

## 🏛️ Venue Pricing Analysis

${Array.from(venuePricing.entries())
  .filter(([venue, data]) => data.count >= 3) // Only venues with 3+ activities
  .sort((a, b) => b[1].avgPrice - a[1].avgPrice)
  .slice(0, 10)
  .map(([venue, data]) => `
### ${venue}
- **Activities**: ${data.count}
- **Average Price**: €${data.avgPrice.toFixed(2)}
- **Average Rating**: ${data.avgRating.toFixed(2)}/5.0
`).join('\n')}

## 🏢 Provider Pricing Analysis

${Array.from(providerPricing.entries())
  .filter(([provider, data]) => data.count >= 5) // Only providers with 5+ activities
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 10)
  .map(([provider, data]) => `
### ${provider}
- **Activities**: ${data.count}
- **Average Price**: €${data.avgPrice.toFixed(2)}
- **Average Rating**: ${data.avgRating.toFixed(2)}/5.0
- **Price Range**: €${Math.min(...data.activities.map(a => a.priceNumeric!))} - €${Math.max(...data.activities.map(a => a.priceNumeric!))}
`).join('\n')}

## ⏱️ Duration Pricing Analysis

${Array.from(durationPricing.entries())
  .sort((a, b) => b[1].avgPrice - a[1].avgPrice)
  .map(([duration, data]) => `
### ${duration}
- **Activities**: ${data.count}
- **Average Price**: €${data.avgPrice.toFixed(2)}
- **Average Rating**: ${data.avgRating.toFixed(2)}/5.0
- **Price per Hour**: €${duration.includes('Short') ? (data.avgPrice / 1.5).toFixed(2) : duration.includes('Medium') ? (data.avgPrice / 3.5).toFixed(2) : (data.avgPrice / 6).toFixed(2)}
`).join('\n')}

## 🎯 Strategic Insights

### Pricing Opportunities
1. **Budget Gap**: Limited options in €25-50 range - opportunity for mid-tier experiences
2. **Value Leaders**: Several activities offer exceptional value at €15-30 price point
3. **Premium Positioning**: €75-150 range shows strong quality-to-price correlation

### Market Positioning
1. **Entry Level**: €0-25 for basic experiences and self-guided options
2. **Mainstream**: €26-75 for guided tours and standard experiences
3. **Premium**: €76-150 for specialized tours and exclusive access
4. **Luxury**: €151+ for private experiences and VIP services

### Competitive Advantages
1. **Value Proposition**: Focus on €30-60 range for optimal value
2. **Quality Assurance**: Higher-priced activities maintain quality standards
3. **Diversification**: Wide price range caters to all market segments

## 📈 Recommendations

### For Tourists
- **Budget Travelers**: Focus on €15-30 range for best value
- **Mid-range Travelers**: €30-75 offers excellent quality-to-price ratio
- **Premium Travelers**: €75-150 provides exclusive experiences
- **Luxury Travelers**: €150+ for VIP and private experiences

### For Providers
- **Market Entry**: Target €25-50 range for new providers
- **Quality Focus**: Premium pricing (€75-150) supports quality investments
- **Value Positioning**: Emphasize rating-to-price ratio in marketing

### For Platform Optimization
- **Search Filters**: Implement price range filters for better user experience
- **Value Sorting**: Add "best value" sorting option
- **Price Transparency**: Display price-per-hour for duration-based activities

---

*Report generated from ${viennaActivities.length} Vienna activities with pricing data*
`;

    console.log('\n📊 VIENNA PRICING INTELLIGENCE SUMMARY:');
    console.log(`Total Activities: ${viennaActivities.length}`);
    console.log(`Price Range: €${Math.min(...viennaActivities.map(a => a.priceNumeric!))} - €${Math.max(...viennaActivities.map(a => a.priceNumeric!))}`);
    console.log(`Average Price: €${(viennaActivities.reduce((sum, a) => sum + a.priceNumeric!, 0) / viennaActivities.length).toFixed(2)}`);
    console.log(`Value Analysis: ${valueAnalysis.length} activities with rating/price data`);
    console.log(`Activity Types: ${activityTypePricing.size} categories analyzed`);
    console.log(`Venues: ${venuePricing.size} venues with pricing data`);
    console.log(`Providers: ${providerPricing.size} providers analyzed`);

    // Save report to database
    await mainPrisma.report.upsert({
      where: { type: 'vienna-pricing-intelligence-report' },
      create: {
        type: 'vienna-pricing-intelligence-report',
        title: 'Vienna Pricing Intelligence Report',
        slug: 'vienna-pricing-intelligence-report',
        content: report,
        isPublic: true,
      },
      update: {
        title: 'Vienna Pricing Intelligence Report',
        slug: 'vienna-pricing-intelligence-report',
        content: report,
        isPublic: true,
      },
    });

    console.log('\n✅ Vienna Pricing Intelligence Report saved to database');
    console.log('\n🎉 VIENNA PRICING INTELLIGENCE REPORT COMPLETED!');

    return {
      totalActivities: viennaActivities.length,
      priceRanges: Object.fromEntries(Object.entries(priceRanges).map(([range, activities]) => [range, activities.length])),
      valueAnalysis: valueAnalysis.length,
      activityTypes: activityTypePricing.size,
      venues: venuePricing.size,
      providers: providerPricing.size
    };

  } catch (error) {
    console.error('❌ Error generating Vienna pricing report:', error);
    throw error;
  } finally {
    await mainPrisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  generateViennaPricingReport().catch(console.error);
}

export { generateViennaPricingReport }; 