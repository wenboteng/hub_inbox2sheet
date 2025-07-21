import { mainPrisma } from '../src/lib/dual-prisma';

async function verifyViennaActivities() {
  console.log('🔍 VERIFYING VIENNA ACTIVITIES DATA QUALITY...\n');

  try {
    await mainPrisma.$connect();
    
    console.log('✅ Connected to main database');

    // Step 1: Get all activities that mention Vienna
    const allViennaMentioned = await mainPrisma.importedGYGActivity.findMany({
      where: {
        OR: [
          { location: { contains: 'Vienna', mode: 'insensitive' } },
          { city: { contains: 'Vienna', mode: 'insensitive' } },
          { venue: { contains: 'Vienna', mode: 'insensitive' } },
          { activityName: { contains: 'Vienna', mode: 'insensitive' } },
          { description: { contains: 'Vienna', mode: 'insensitive' } },
          { providerName: { contains: 'Vienna', mode: 'insensitive' } }
        ]
      }
    });

    console.log(`📊 Initial search found ${allViennaMentioned.length} activities mentioning Vienna`);

    // Step 2: Filter for actual Vienna activities (exclude other cities)
    const viennaOnly = allViennaMentioned.filter(activity => {
      const location = activity.location?.toLowerCase() || '';
      const city = activity.city?.toLowerCase() || '';
      const name = activity.activityName?.toLowerCase() || '';
      const description = activity.description?.toLowerCase() || '';

      // Exclude activities that are clearly from other cities
      const otherCities = [
        'madrid', 'barcelona', 'rome', 'paris', 'london', 'berlin', 'amsterdam',
        'prague', 'budapest', 'salzburg', 'hallstatt', 'bratislava', 'venice',
        'florence', 'milan', 'naples', 'seville', 'valencia', 'bilbao', 'granada'
      ];

      // Check if activity mentions other cities more prominently than Vienna
      for (const otherCity of otherCities) {
        if (location.includes(otherCity) && !location.includes('vienna')) {
          return false;
        }
        if (city.includes(otherCity) && !city.includes('vienna')) {
          return false;
        }
      }

      // Must have some Vienna reference
      return location.includes('vienna') || 
             city.includes('vienna') || 
             name.includes('vienna') ||
             description.includes('vienna');
    });

    console.log(`📍 Filtered to ${viennaOnly.length} actual Vienna activities`);

    // Step 3: Check for duplicates
    const duplicates = new Map<string, any[]>();
    const uniqueActivities = new Map<string, any>();

    for (const activity of viennaOnly) {
      const key = activity.activityName?.toLowerCase().trim() || '';
      if (key) {
        if (duplicates.has(key)) {
          duplicates.get(key)!.push(activity);
        } else {
          duplicates.set(key, [activity]);
        }
      }
    }

    const actualDuplicates = Array.from(duplicates.values()).filter(group => group.length > 1);
    const uniqueViennaActivities = viennaOnly.filter(activity => {
      const key = activity.activityName?.toLowerCase().trim() || '';
      const group = duplicates.get(key);
      return !group || group.length === 1;
    });

    console.log(`🔄 Found ${actualDuplicates.length} duplicate groups`);
    console.log(`✅ Unique Vienna activities: ${uniqueViennaActivities.length}`);

    // Step 4: Data quality analysis
    const qualityAnalysis = {
      total: uniqueViennaActivities.length,
      withProviderName: 0,
      withRating: 0,
      withReviewCount: 0,
      withPrice: 0,
      withAllData: 0,
      missingData: [] as any[]
    };

    for (const activity of uniqueViennaActivities) {
      const hasProvider = !!activity.providerName?.trim();
      const hasRating = !!activity.ratingNumeric;
      const hasReviewCount = !!activity.reviewCountNumeric;
      const hasPrice = !!activity.priceNumeric;

      if (hasProvider) qualityAnalysis.withProviderName++;
      if (hasRating) qualityAnalysis.withRating++;
      if (hasReviewCount) qualityAnalysis.withReviewCount++;
      if (hasPrice) qualityAnalysis.withPrice++;

      if (hasProvider && hasRating && hasReviewCount && hasPrice) {
        qualityAnalysis.withAllData++;
      } else {
        qualityAnalysis.missingData.push({
          id: activity.id,
          name: activity.activityName,
          provider: hasProvider ? '✅' : '❌',
          rating: hasRating ? '✅' : '❌',
          reviews: hasReviewCount ? '✅' : '❌',
          price: hasPrice ? '✅' : '❌'
        });
      }
    }

    // Step 5: Generate detailed report
    const report = `
# Vienna Activities Data Quality Verification Report

## 📊 Data Quality Summary
- **Initial Search Results**: ${allViennaMentioned.length} activities mentioning Vienna
- **Actual Vienna Activities**: ${viennaOnly.length} activities
- **Unique Vienna Activities**: ${uniqueViennaActivities.length} activities
- **Duplicate Groups Found**: ${actualDuplicates.length}

## ✅ Data Completeness Analysis
- **Activities with Provider Name**: ${qualityAnalysis.withProviderName} (${((qualityAnalysis.withProviderName / qualityAnalysis.total) * 100).toFixed(1)}%)
- **Activities with Rating**: ${qualityAnalysis.withRating} (${((qualityAnalysis.withRating / qualityAnalysis.total) * 100).toFixed(1)}%)
- **Activities with Review Count**: ${qualityAnalysis.withReviewCount} (${((qualityAnalysis.withReviewCount / qualityAnalysis.total) * 100).toFixed(1)}%)
- **Activities with Price**: ${qualityAnalysis.withPrice} (${((qualityAnalysis.withPrice / qualityAnalysis.total) * 100).toFixed(1)}%)
- **Activities with ALL Data**: ${qualityAnalysis.withAllData} (${((qualityAnalysis.withAllData / qualityAnalysis.total) * 100).toFixed(1)}%)

## 🔄 Duplicate Analysis
${actualDuplicates.map((group, index) => `
### Duplicate Group ${index + 1}: "${group[0].activityName}"
${group.map((activity, idx) => `- ${idx + 1}. ID: ${activity.id}, Provider: ${activity.providerName || 'N/A'}`).join('\n')}
`).join('\n')}

## ❌ Activities Missing Data
${qualityAnalysis.missingData.slice(0, 20).map(activity => 
  `- **${activity.name}** - Provider: ${activity.provider} | Rating: ${activity.rating} | Reviews: ${activity.reviews} | Price: ${activity.price}`
).join('\n')}

${qualityAnalysis.missingData.length > 20 ? `\n... and ${qualityAnalysis.missingData.length - 20} more activities with missing data` : ''}

## 🎯 Recommendations
1. **Data Cleaning**: Remove ${actualDuplicates.length} duplicate groups
2. **Data Enhancement**: Focus on activities missing provider names, ratings, or prices
3. **Quality Improvement**: Target ${qualityAnalysis.total - qualityAnalysis.withAllData} activities for data completion

## 📈 Final Vienna Activities Count
**Verified Unique Vienna Activities**: ${uniqueViennaActivities.length}

---

*Verification completed on ${new Date().toISOString()}*
`;

    // Step 6: Show duplicate examples
    if (actualDuplicates.length > 0) {
      console.log('\n🔄 DUPLICATE EXAMPLES:');
      actualDuplicates.slice(0, 3).forEach((group, index) => {
        console.log(`\nDuplicate Group ${index + 1}: "${group[0].activityName}"`);
        group.forEach((activity, idx) => {
          console.log(`  ${idx + 1}. ID: ${activity.id}, Provider: ${activity.providerName || 'N/A'}`);
        });
      });
    }

    // Step 7: Show quality metrics
    console.log('\n📊 DATA QUALITY METRICS:');
    console.log(`Total Unique Vienna Activities: ${qualityAnalysis.total}`);
    console.log(`With Provider Name: ${qualityAnalysis.withProviderName} (${((qualityAnalysis.withProviderName / qualityAnalysis.total) * 100).toFixed(1)}%)`);
    console.log(`With Rating: ${qualityAnalysis.withRating} (${((qualityAnalysis.withRating / qualityAnalysis.total) * 100).toFixed(1)}%)`);
    console.log(`With Review Count: ${qualityAnalysis.withReviewCount} (${((qualityAnalysis.withReviewCount / qualityAnalysis.total) * 100).toFixed(1)}%)`);
    console.log(`With Price: ${qualityAnalysis.withPrice} (${((qualityAnalysis.withPrice / qualityAnalysis.total) * 100).toFixed(1)}%)`);
    console.log(`With ALL Data: ${qualityAnalysis.withAllData} (${((qualityAnalysis.withAllData / qualityAnalysis.total) * 100).toFixed(1)}%)`);

    // Save verification report
    await mainPrisma.report.upsert({
      where: { type: 'vienna-activities-verification' },
      create: {
        type: 'vienna-activities-verification',
        title: 'Vienna Activities Data Quality Verification Report',
        slug: 'vienna-activities-verification',
        content: report,
        isPublic: true,
      },
      update: {
        title: 'Vienna Activities Data Quality Verification Report',
        slug: 'vienna-activities-verification',
        content: report,
        isPublic: true,
      },
    });

    console.log('\n✅ Vienna activities verification report saved to database');
    console.log('\n🎉 VIENNA ACTIVITIES VERIFICATION COMPLETED!');

    return {
      totalViennaActivities: qualityAnalysis.total,
      duplicates: actualDuplicates.length,
      withAllData: qualityAnalysis.withAllData,
      qualityMetrics: qualityAnalysis
    };

  } catch (error) {
    console.error('❌ Error verifying Vienna activities:', error);
    throw error;
  } finally {
    await mainPrisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  verifyViennaActivities().catch(console.error);
}

export { verifyViennaActivities }; 