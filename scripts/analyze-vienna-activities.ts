import { mainPrisma } from '../src/lib/dual-prisma';

async function analyzeViennaActivities() {
  console.log('🏛️ ANALYZING VIENNA ACTIVITIES...\n');

  try {
    await mainPrisma.$connect();
    
    console.log('✅ Connected to main database');

    // Find all activities that mention Vienna
    const viennaActivities = await mainPrisma.importedGYGActivity.findMany({
      where: {
        OR: [
          { location: { contains: 'Vienna', mode: 'insensitive' } },
          { city: { contains: 'Vienna', mode: 'insensitive' } },
          { venue: { contains: 'Vienna', mode: 'insensitive' } },
          { activityName: { contains: 'Vienna', mode: 'insensitive' } },
          { description: { contains: 'Vienna', mode: 'insensitive' } },
          { providerName: { contains: 'Vienna', mode: 'insensitive' } }
        ]
      },
      orderBy: { ratingNumeric: 'desc' }
    });

    console.log(`📊 Found ${viennaActivities.length} Vienna-related activities`);

    // Analyze by location type
    const locationAnalysis = {
      directVienna: 0,
      viennaVenues: 0,
      viennaPalaces: 0,
      viennaMuseums: 0,
      viennaTours: 0,
      otherVienna: 0
    };

    const viennaVenues = [
      'Schönbrunn', 'Hofburg', 'Belvedere', 'St. Stephen', 'Stephansdom',
      'Spanish Riding School', 'Vienna State Opera', 'Albertina', 'Museum',
      'Palace', 'Theater', 'Concert', 'Danube', 'Prater', 'Retiro'
    ];

    const viennaPalaces = [
      'Schönbrunn Palace', 'Hofburg Palace', 'Belvedere Palace', 'Royal Palace',
      'Imperial Palace', 'Palace', 'Schloss'
    ];

    const viennaMuseums = [
      'Museum', 'Prado', 'Reina Sofia', 'Thyssen', 'Albertina', 'Kunsthistorisches',
      'Natural History', 'Art Gallery', 'Exhibition'
    ];

    const viennaTours = [
      'Tour', 'Guided', 'Walking Tour', 'Bike Tour', 'Segway', 'Tuk Tuk',
      'Private Tour', 'City Tour', 'Sightseeing'
    ];

    for (const activity of viennaActivities) {
      const location = activity.location?.toLowerCase() || '';
      const venue = activity.venue?.toLowerCase() || '';
      const name = activity.activityName?.toLowerCase() || '';
      const description = activity.description?.toLowerCase() || '';

      const fullText = `${location} ${venue} ${name} ${description}`;

      if (viennaPalaces.some(palace => fullText.includes(palace.toLowerCase()))) {
        locationAnalysis.viennaPalaces++;
      } else if (viennaMuseums.some(museum => fullText.includes(museum.toLowerCase()))) {
        locationAnalysis.viennaMuseums++;
      } else if (viennaTours.some(tour => fullText.includes(tour.toLowerCase()))) {
        locationAnalysis.viennaTours++;
      } else if (viennaVenues.some(venue => fullText.includes(venue.toLowerCase()))) {
        locationAnalysis.viennaVenues++;
      } else if (location.includes('vienna') || venue.includes('vienna')) {
        locationAnalysis.directVienna++;
      } else {
        locationAnalysis.otherVienna++;
      }
    }

    // Get top rated Vienna activities
    const topRatedVienna = viennaActivities
      .filter(a => a.ratingNumeric && a.ratingNumeric >= 4.0)
      .slice(0, 10);

    // Get activities with highest review counts
    const mostReviewedVienna = viennaActivities
      .filter(a => a.reviewCountNumeric && a.reviewCountNumeric >= 100)
      .sort((a, b) => (b.reviewCountNumeric || 0) - (a.reviewCountNumeric || 0))
      .slice(0, 10);

    // Price analysis for Vienna activities
    const viennaWithPrices = viennaActivities.filter(a => a.priceNumeric);
    const averagePrice = viennaWithPrices.length > 0 
      ? viennaWithPrices.reduce((sum, a) => sum + (a.priceNumeric || 0), 0) / viennaWithPrices.length
      : 0;

    // Generate report
    const report = `
# Vienna Activities Analysis Report

## 📊 Overview
- **Total Vienna Activities**: ${viennaActivities.length}
- **Activities with Ratings**: ${viennaActivities.filter(a => a.ratingNumeric).length}
- **Activities with Prices**: ${viennaWithPrices.length}
- **Average Price**: €${averagePrice.toFixed(2)}

## 🏛️ Activity Types in Vienna
- **Palace Activities**: ${locationAnalysis.viennaPalaces}
- **Museum Activities**: ${locationAnalysis.viennaMuseums}
- **Tour Activities**: ${locationAnalysis.viennaTours}
- **Venue Activities**: ${locationAnalysis.viennaVenues}
- **Direct Vienna Location**: ${locationAnalysis.directVienna}
- **Other Vienna Related**: ${locationAnalysis.otherVienna}

## ⭐ Top Rated Vienna Activities (4.0+ stars)
${topRatedVienna.map((activity, index) => 
  `${index + 1}. **${activity.activityName}** - ${activity.ratingNumeric}/5 (${activity.reviewCountNumeric || 0} reviews)`
).join('\n')}

## 📈 Most Reviewed Vienna Activities
${mostReviewedVienna.map((activity, index) => 
  `${index + 1}. **${activity.activityName}** - ${activity.reviewCountNumeric} reviews (${activity.ratingNumeric || 'N/A'}/5)`
).join('\n')}

## 💰 Price Range Analysis
- **Lowest Price**: €${Math.min(...viennaWithPrices.map(a => a.priceNumeric || 0)).toFixed(2)}
- **Highest Price**: €${Math.max(...viennaWithPrices.map(a => a.priceNumeric || 0)).toFixed(2)}
- **Average Price**: €${averagePrice.toFixed(2)}

## 🎯 Key Insights
1. **Vienna is a major tourist destination** with ${viennaActivities.length} activities
2. **Palace and museum activities** are prominent (${locationAnalysis.viennaPalaces + locationAnalysis.viennaMuseums} combined)
3. **Tour activities** are popular (${locationAnalysis.viennaTours})
4. **Average rating** for Vienna activities: ${(viennaActivities.reduce((sum, a) => sum + (a.ratingNumeric || 0), 0) / viennaActivities.filter(a => a.ratingNumeric).length).toFixed(2)}/5

## 📍 Location Breakdown
- Activities directly mentioning Vienna: ${locationAnalysis.directVienna}
- Activities at Vienna venues/palaces: ${locationAnalysis.viennaVenues + locationAnalysis.viennaPalaces}
- Tour activities in Vienna: ${locationAnalysis.viennaTours}
- Museum activities in Vienna: ${locationAnalysis.viennaMuseums}

---

*Report generated on ${new Date().toISOString()}*
`;

    console.log('\n📊 VIENNA ACTIVITIES ANALYSIS:');
    console.log(`Total Vienna Activities: ${viennaActivities.length}`);
    console.log(`Palace Activities: ${locationAnalysis.viennaPalaces}`);
    console.log(`Museum Activities: ${locationAnalysis.viennaMuseums}`);
    console.log(`Tour Activities: ${locationAnalysis.viennaTours}`);
    console.log(`Venue Activities: ${locationAnalysis.viennaVenues}`);
    console.log(`Direct Vienna Location: ${locationAnalysis.directVienna}`);
    console.log(`Other Vienna Related: ${locationAnalysis.otherVienna}`);

    console.log('\n⭐ Top 5 Rated Vienna Activities:');
    topRatedVienna.slice(0, 5).forEach((activity, index) => {
      console.log(`${index + 1}. ${activity.activityName} - ${activity.ratingNumeric}/5`);
    });

    // Save report to database
    await mainPrisma.report.upsert({
      where: { type: 'vienna-activities-analysis' },
      create: {
        type: 'vienna-activities-analysis',
        title: 'Vienna Activities Analysis Report',
        slug: 'vienna-activities-analysis',
        content: report,
        isPublic: true,
      },
      update: {
        title: 'Vienna Activities Analysis Report',
        slug: 'vienna-activities-analysis',
        content: report,
        isPublic: true,
      },
    });

    console.log('\n✅ Vienna activities analysis report saved to database');
    console.log('\n🎉 VIENNA ACTIVITIES ANALYSIS COMPLETED!');

  } catch (error) {
    console.error('❌ Error analyzing Vienna activities:', error);
    throw error;
  } finally {
    await mainPrisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  analyzeViennaActivities().catch(console.error);
}

export { analyzeViennaActivities }; 