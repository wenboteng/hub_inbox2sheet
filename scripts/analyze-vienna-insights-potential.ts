import { mainPrisma } from '../src/lib/dual-prisma';

async function analyzeViennaInsightsPotential() {
  console.log('🔍 ANALYZING VIENNA ACTIVITIES FOR INSIGHTS REPORTS...\n');

  try {
    await mainPrisma.$connect();
    
    console.log('✅ Connected to main database');

    // Get comprehensive Vienna data
    const viennaActivities = await mainPrisma.importedGYGActivity.findMany({
      where: {
        OR: [
          { location: { contains: 'Vienna', mode: 'insensitive' } },
          { activityName: { contains: 'Vienna', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        activityName: true,
        reviewCountNumeric: true,
        ratingNumeric: true,
        priceNumeric: true,
        priceText: true,
        providerName: true,
        location: true,
        venue: true,
        duration: true,
        tags: true,
        description: true,
        durationHours: true,
        durationDays: true,
        priceCurrency: true,
        qualityScore: true
      }
    });

    console.log(`📊 Analyzing ${viennaActivities.length} Vienna activities for insights potential`);

    // 1. PRICING ANALYSIS
    console.log('\n💰 PRICING INSIGHTS POTENTIAL:');
    const validPrices = viennaActivities.filter(a => a.priceNumeric !== null);
    const priceRanges = {
      'Budget (€0-25)': validPrices.filter(a => a.priceNumeric! <= 25).length,
      'Mid-range (€26-75)': validPrices.filter(a => a.priceNumeric! > 25 && a.priceNumeric! <= 75).length,
      'Premium (€76-150)': validPrices.filter(a => a.priceNumeric! > 75 && a.priceNumeric! <= 150).length,
      'Luxury (€150+)': validPrices.filter(a => a.priceNumeric! > 150).length
    };
    
    console.log('Price Distribution:', priceRanges);
    console.log('Average Price:', (validPrices.reduce((sum, a) => sum + a.priceNumeric!, 0) / validPrices.length).toFixed(2));
    console.log('Price Range:', `${Math.min(...validPrices.map(a => a.priceNumeric!))} - ${Math.max(...validPrices.map(a => a.priceNumeric!))}`);

    // 2. RATING ANALYSIS
    console.log('\n⭐ RATING INSIGHTS POTENTIAL:');
    const validRatings = viennaActivities.filter(a => a.ratingNumeric !== null);
    const ratingRanges = {
      'Excellent (4.5-5.0)': validRatings.filter(a => a.ratingNumeric! >= 4.5).length,
      'Very Good (4.0-4.4)': validRatings.filter(a => a.ratingNumeric! >= 4.0 && a.ratingNumeric! < 4.5).length,
      'Good (3.5-3.9)': validRatings.filter(a => a.ratingNumeric! >= 3.5 && a.ratingNumeric! < 4.0).length,
      'Average (3.0-3.4)': validRatings.filter(a => a.ratingNumeric! >= 3.0 && a.ratingNumeric! < 3.5).length,
      'Below Average (<3.0)': validRatings.filter(a => a.ratingNumeric! < 3.0).length
    };
    
    console.log('Rating Distribution:', ratingRanges);
    console.log('Average Rating:', (validRatings.reduce((sum, a) => sum + a.ratingNumeric!, 0) / validRatings.length).toFixed(2));

    // 3. ACTIVITY TYPE ANALYSIS
    console.log('\n🎭 ACTIVITY TYPE INSIGHTS POTENTIAL:');
    const activityTypes = new Map<string, number>();
    const venueTypes = new Map<string, number>();
    
    viennaActivities.forEach(activity => {
      // Analyze activity names for types
      const name = activity.activityName.toLowerCase();
      if (name.includes('tour')) activityTypes.set('Tours', (activityTypes.get('Tours') || 0) + 1);
      if (name.includes('concert') || name.includes('music')) activityTypes.set('Concerts & Music', (activityTypes.get('Concerts & Music') || 0) + 1);
      if (name.includes('museum') || name.includes('gallery')) activityTypes.set('Museums & Galleries', (activityTypes.get('Museums & Galleries') || 0) + 1);
      if (name.includes('palace') || name.includes('castle')) activityTypes.set('Palaces & Castles', (activityTypes.get('Palaces & Castles') || 0) + 1);
      if (name.includes('food') || name.includes('wine') || name.includes('dining')) activityTypes.set('Food & Wine', (activityTypes.get('Food & Wine') || 0) + 1);
      if (name.includes('walking') || name.includes('hiking')) activityTypes.set('Walking & Hiking', (activityTypes.get('Walking & Hiking') || 0) + 1);
      if (name.includes('bike') || name.includes('cycling')) activityTypes.set('Biking', (activityTypes.get('Biking') || 0) + 1);
      if (name.includes('transport') || name.includes('transfer')) activityTypes.set('Transport', (activityTypes.get('Transport') || 0) + 1);
      
      // Analyze venues
      if (activity.venue) {
        const venue = activity.venue.toLowerCase();
        if (venue.includes('schönbrunn')) venueTypes.set('Schönbrunn Palace', (venueTypes.get('Schönbrunn Palace') || 0) + 1);
        if (venue.includes('hofburg')) venueTypes.set('Hofburg Palace', (venueTypes.get('Hofburg Palace') || 0) + 1);
        if (venue.includes('belvedere')) venueTypes.set('Belvedere Palace', (venueTypes.get('Belvedere Palace') || 0) + 1);
        if (venue.includes('st. stephen') || venue.includes('stephens')) venueTypes.set('St. Stephen\'s Cathedral', (venueTypes.get('St. Stephen\'s Cathedral') || 0) + 1);
        if (venue.includes('opera') || venue.includes('oper')) venueTypes.set('Vienna State Opera', (venueTypes.get('Vienna State Opera') || 0) + 1);
      }
    });
    
    console.log('Activity Types:', Object.fromEntries(activityTypes));
    console.log('Popular Venues:', Object.fromEntries(venueTypes));

    // 4. PROVIDER ANALYSIS
    console.log('\n🏢 PROVIDER INSIGHTS POTENTIAL:');
    const providers = new Map<string, { count: number, avgRating: number, avgPrice: number }>();
    
    viennaActivities.forEach(activity => {
      if (activity.providerName) {
        const provider = activity.providerName.trim();
        if (!providers.has(provider)) {
          providers.set(provider, { count: 0, avgRating: 0, avgPrice: 0 });
        }
        const providerData = providers.get(provider)!;
        providerData.count++;
        if (activity.ratingNumeric) providerData.avgRating += activity.ratingNumeric;
        if (activity.priceNumeric) providerData.avgPrice += activity.priceNumeric;
      }
    });
    
    // Calculate averages
    providers.forEach((data, provider) => {
      data.avgRating = data.avgRating / data.count;
      data.avgPrice = data.avgPrice / data.count;
    });
    
    const topProviders = Array.from(providers.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
    
    console.log('Top 10 Providers by Activity Count:', topProviders.map(([name, data]) => `${name}: ${data.count} activities`));

    // 5. REVIEW ANALYSIS
    console.log('\n📝 REVIEW INSIGHTS POTENTIAL:');
    const validReviews = viennaActivities.filter(a => a.reviewCountNumeric !== null);
    const reviewRanges = {
      'High Popularity (1000+ reviews)': validReviews.filter(a => a.reviewCountNumeric! >= 1000).length,
      'Popular (100-999 reviews)': validReviews.filter(a => a.reviewCountNumeric! >= 100 && a.reviewCountNumeric! < 1000).length,
      'Moderate (10-99 reviews)': validReviews.filter(a => a.reviewCountNumeric! >= 10 && a.reviewCountNumeric! < 100).length,
      'Low (<10 reviews)': validReviews.filter(a => a.reviewCountNumeric! < 10).length
    };
    
    console.log('Review Count Distribution:', reviewRanges);
    console.log('Average Review Count:', (validReviews.reduce((sum, a) => sum + a.reviewCountNumeric!, 0) / validReviews.length).toFixed(0));

    // 6. DURATION ANALYSIS
    console.log('\n⏱️ DURATION INSIGHTS POTENTIAL:');
    const durationPatterns = new Map<string, number>();
    
    viennaActivities.forEach(activity => {
      if (activity.duration) {
        const duration = activity.duration.toLowerCase();
        if (duration.includes('hour') || duration.includes('hr')) {
          const hourMatch = duration.match(/(\d+)\s*hour/);
          if (hourMatch) {
            const hours = parseInt(hourMatch[1]);
            if (hours <= 2) durationPatterns.set('Short (1-2 hours)', (durationPatterns.get('Short (1-2 hours)') || 0) + 1);
            else if (hours <= 4) durationPatterns.set('Medium (3-4 hours)', (durationPatterns.get('Medium (3-4 hours)') || 0) + 1);
            else durationPatterns.set('Long (5+ hours)', (durationPatterns.get('Long (5+ hours)') || 0) + 1);
          }
        }
      }
    });
    
    console.log('Duration Patterns:', Object.fromEntries(durationPatterns));

    // 7. VALUE ANALYSIS (Rating vs Price)
    console.log('\n💎 VALUE INSIGHTS POTENTIAL:');
    const valueActivities = viennaActivities.filter(a => a.ratingNumeric !== null && a.priceNumeric !== null);
    const valueScore = valueActivities.map(a => ({
      name: a.activityName,
      valueScore: a.ratingNumeric! / (a.priceNumeric! / 100), // Rating per €100
      rating: a.ratingNumeric!,
      price: a.priceNumeric!
    })).sort((a, b) => b.valueScore - a.valueScore);
    
    console.log('Top 5 Best Value Activities:', valueScore.slice(0, 5).map(a => `${a.name}: ${a.valueScore.toFixed(2)} rating/€100`));

    // 8. REPORT IDEAS SUMMARY
    console.log('\n📊 POTENTIAL VIENNA INSIGHTS REPORTS:');
    console.log('\n1. 🏛️ VIENNA CULTURAL ATTRACTIONS REPORT');
    console.log('   - Palace & Museum popularity analysis');
    console.log('   - Cultural venue performance metrics');
    console.log('   - Historical site visitor insights');
    
    console.log('\n2. 💰 VIENNA PRICING INTELLIGENCE REPORT');
    console.log('   - Price range distribution analysis');
    console.log('   - Value for money assessment');
    console.log('   - Premium vs budget activity comparison');
    
    console.log('\n3. ⭐ VIENNA QUALITY & POPULARITY REPORT');
    console.log('   - Top-rated activities by category');
    console.log('   - Most reviewed experiences');
    console.log('   - Quality vs popularity correlation');
    
    console.log('\n4. 🎭 VIENNA ACTIVITY TYPE ANALYSIS');
    console.log('   - Tour vs museum vs concert preferences');
    console.log('   - Seasonal activity trends');
    console.log('   - Activity type performance metrics');
    
    console.log('\n5. 🏢 VIENNA PROVIDER COMPETITIVE ANALYSIS');
    console.log('   - Top providers by activity count');
    console.log('   - Provider quality comparison');
    console.log('   - Market share analysis');
    
    console.log('\n6. 📍 VIENNA LOCATION & VENUE INSIGHTS');
    console.log('   - Popular venue performance');
    console.log('   - Location-based pricing analysis');
    console.log('   - Venue-specific quality metrics');
    
    console.log('\n7. ⏱️ VIENNA DURATION & SCHEDULING REPORT');
    console.log('   - Activity duration preferences');
    console.log('   - Time investment vs value analysis');
    console.log('   - Scheduling optimization insights');
    
    console.log('\n8. 🎯 VIENNA TOURIST PREFERENCE ANALYSIS');
    console.log('   - Tourist behavior patterns');
    console.log('   - Activity combination insights');
    console.log('   - Seasonal preference trends');

    return {
      totalActivities: viennaActivities.length,
      pricingInsights: priceRanges,
      ratingInsights: ratingRanges,
      activityTypes: Object.fromEntries(activityTypes),
      topProviders: topProviders.length,
      reviewInsights: reviewRanges,
      valueInsights: valueScore.length
    };

  } catch (error) {
    console.error('❌ Error analyzing Vienna insights potential:', error);
    throw error;
  } finally {
    await mainPrisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  analyzeViennaInsightsPotential().catch(console.error);
}

export { analyzeViennaInsightsPotential }; 