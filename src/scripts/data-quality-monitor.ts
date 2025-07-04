import { mainPrisma } from '../lib/dual-prisma';

interface QualityMetrics {
  totalActivities: number;
  priceCoverage: number;
  ratingCoverage: number;
  locationCoverage: number;
  durationCoverage: number;
  tagsCoverage: number;
  averageQualityScore: number;
  qualityDistribution: Record<string, number>;
  topIssues: string[];
  recommendations: string[];
}

async function monitorDataQuality() {
  console.log('📊 MONITORING GYG DATA QUALITY...\n');

  try {
    await mainPrisma.$connect();
    
    console.log('✅ Connected to main database');

    // Get total count
    const totalActivities = await mainPrisma.importedGYGActivity.count();
    console.log(`📊 Total activities: ${totalActivities}`);

    if (totalActivities === 0) {
      console.log('❌ No data found. Run data cleaning first.');
      return;
    }

    // Calculate quality metrics
    const metrics = await calculateQualityMetrics();
    
    console.log('\n📈 QUALITY METRICS:');
    console.log(`💰 Price Coverage: ${metrics.priceCoverage}%`);
    console.log(`⭐ Rating Coverage: ${metrics.ratingCoverage}%`);
    console.log(`📍 Location Coverage: ${metrics.locationCoverage}%`);
    console.log(`⏱️ Duration Coverage: ${metrics.durationCoverage}%`);
    console.log(`🏷️ Tags Coverage: ${metrics.tagsCoverage}%`);
    console.log(`📊 Average Quality Score: ${metrics.averageQualityScore.toFixed(1)}/100`);

    console.log('\n📊 QUALITY DISTRIBUTION:');
    Object.entries(metrics.qualityDistribution).forEach(([score, count]) => {
      const percentage = ((count / totalActivities) * 100).toFixed(1);
      console.log(`  ${score}/100: ${count} activities (${percentage}%)`);
    });

    console.log('\n⚠️ TOP ISSUES:');
    metrics.topIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });

    console.log('\n💡 RECOMMENDATIONS:');
    metrics.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

    // Generate quality report
    const report = generateQualityReport(metrics);
    await saveQualityReport(report);

    console.log('\n✅ Quality monitoring report saved');
    console.log('\n🎯 DATA QUALITY MONITORING COMPLETED!');

  } catch (error) {
    console.error('❌ Error during quality monitoring:', error);
  } finally {
    await mainPrisma.$disconnect();
  }
}

async function calculateQualityMetrics(): Promise<QualityMetrics> {
  const totalActivities = await mainPrisma.importedGYGActivity.count();

  // Calculate coverage percentages
  const priceCoverage = await mainPrisma.importedGYGActivity.count({
    where: { priceNumeric: { not: null } }
  });

  const ratingCoverage = await mainPrisma.importedGYGActivity.count({
    where: { ratingNumeric: { not: null } }
  });

  const locationCoverage = await mainPrisma.importedGYGActivity.count({
    where: { location: { not: '' } }
  });

  const durationCoverage = await mainPrisma.importedGYGActivity.count({
    where: {
      OR: [
        { durationHours: { not: null } },
        { durationDays: { not: null } }
      ]
    }
  });

  const tagsCoverage = await mainPrisma.importedGYGActivity.count({
    where: { tags: { isEmpty: false } }
  });

  // Get quality score distribution
  const qualityScores = await mainPrisma.importedGYGActivity.findMany({
    select: { qualityScore: true }
  });

  const averageQualityScore = qualityScores.reduce((sum, item) => sum + (item.qualityScore || 0), 0) / totalActivities;

  // Calculate quality distribution
  const qualityDistribution = {
    '90-100': 0,
    '80-89': 0,
    '70-79': 0,
    '60-69': 0,
    '50-59': 0,
    '40-49': 0,
    '30-39': 0,
    '20-29': 0,
    '10-19': 0,
    '0-9': 0
  };

  qualityScores.forEach(item => {
    const score = item.qualityScore || 0;
    if (score >= 90) qualityDistribution['90-100']++;
    else if (score >= 80) qualityDistribution['80-89']++;
    else if (score >= 70) qualityDistribution['70-79']++;
    else if (score >= 60) qualityDistribution['60-69']++;
    else if (score >= 50) qualityDistribution['50-59']++;
    else if (score >= 40) qualityDistribution['40-49']++;
    else if (score >= 30) qualityDistribution['30-39']++;
    else if (score >= 20) qualityDistribution['20-29']++;
    else if (score >= 10) qualityDistribution['10-19']++;
    else qualityDistribution['0-9']++;
  });

  // Identify top issues
  const topIssues = [];
  if (priceCoverage / totalActivities < 0.8) {
    topIssues.push(`Low price coverage (${((priceCoverage / totalActivities) * 100).toFixed(1)}%)`);
  }
  if (ratingCoverage / totalActivities < 0.8) {
    topIssues.push(`Low rating coverage (${((ratingCoverage / totalActivities) * 100).toFixed(1)}%)`);
  }
  if (locationCoverage / totalActivities < 0.9) {
    topIssues.push(`Low location coverage (${((locationCoverage / totalActivities) * 100).toFixed(1)}%)`);
  }
  if (averageQualityScore < 70) {
    topIssues.push(`Low average quality score (${averageQualityScore.toFixed(1)}/100)`);
  }

  // Generate recommendations
  const recommendations = [];
  if (priceCoverage / totalActivities < 0.8) {
    recommendations.push('Improve price extraction from source data');
  }
  if (ratingCoverage / totalActivities < 0.8) {
    recommendations.push('Enhance rating and review parsing');
  }
  if (locationCoverage / totalActivities < 0.9) {
    recommendations.push('Standardize location data collection');
  }
  if (averageQualityScore < 70) {
    recommendations.push('Focus on high-quality data extraction');
  }
  recommendations.push('Set up automated quality monitoring');
  recommendations.push('Implement data validation rules');

  return {
    totalActivities,
    priceCoverage: Math.round((priceCoverage / totalActivities) * 100),
    ratingCoverage: Math.round((ratingCoverage / totalActivities) * 100),
    locationCoverage: Math.round((locationCoverage / totalActivities) * 100),
    durationCoverage: Math.round((durationCoverage / totalActivities) * 100),
    tagsCoverage: Math.round((tagsCoverage / totalActivities) * 100),
    averageQualityScore,
    qualityDistribution,
    topIssues,
    recommendations
  };
}

function generateQualityReport(metrics: QualityMetrics): string {
  const qualityGrade = metrics.averageQualityScore >= 80 ? 'A' : 
                      metrics.averageQualityScore >= 70 ? 'B' : 
                      metrics.averageQualityScore >= 60 ? 'C' : 
                      metrics.averageQualityScore >= 50 ? 'D' : 'F';

  return `
# GYG Data Quality Report

## Executive Summary
- **Total Activities**: ${metrics.totalActivities}
- **Overall Quality Grade**: ${qualityGrade} (${metrics.averageQualityScore.toFixed(1)}/100)
- **Report Date**: ${new Date().toISOString()}

## Quality Metrics

### Data Coverage
- **Price Coverage**: ${metrics.priceCoverage}% ✅
- **Rating Coverage**: ${metrics.ratingCoverage}% ✅
- **Location Coverage**: ${metrics.locationCoverage}% ✅
- **Duration Coverage**: ${metrics.durationCoverage}% ✅
- **Tags Coverage**: ${metrics.tagsCoverage}% ✅

### Quality Score Distribution
${Object.entries(metrics.qualityDistribution)
  .map(([range, count]) => {
    const percentage = ((count / metrics.totalActivities) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round((count / metrics.totalActivities) * 20));
    return `- ${range}: ${count} activities (${percentage}%) ${bar}`;
  })
  .join('\n')}

## Issues Identified
${metrics.topIssues.map(issue => `- ⚠️ ${issue}`).join('\n')}

## Recommendations
${metrics.recommendations.map(rec => `- 💡 ${rec}`).join('\n')}

## Quality Standards

### Target Metrics
- **Price Coverage**: >80%
- **Rating Coverage**: >80%
- **Location Coverage**: >90%
- **Duration Coverage**: >70%
- **Tags Coverage**: >50%
- **Average Quality Score**: >70/100

### Current Status
${metrics.priceCoverage >= 80 ? '✅' : '❌'} Price Coverage: ${metrics.priceCoverage}%
${metrics.ratingCoverage >= 80 ? '✅' : '❌'} Rating Coverage: ${metrics.ratingCoverage}%
${metrics.locationCoverage >= 90 ? '✅' : '❌'} Location Coverage: ${metrics.locationCoverage}%
${metrics.durationCoverage >= 70 ? '✅' : '❌'} Duration Coverage: ${metrics.durationCoverage}%
${metrics.tagsCoverage >= 50 ? '✅' : '❌'} Tags Coverage: ${metrics.tagsCoverage}%
${metrics.averageQualityScore >= 70 ? '✅' : '❌'} Average Quality Score: ${metrics.averageQualityScore.toFixed(1)}/100

## Action Items

### Immediate (This Week)
1. **Address top issues** identified above
2. **Review data extraction** processes
3. **Implement validation** rules

### Short-term (Next Month)
1. **Automate quality monitoring**
2. **Set up alerts** for quality drops
3. **Improve cleaning functions**

### Long-term (Next Quarter)
1. **Machine learning** for better extraction
2. **Real-time quality scoring**
3. **Advanced analytics** on quality trends

## Monitoring Schedule
- **Daily**: Automated quality checks
- **Weekly**: Quality report generation
- **Monthly**: Quality improvement review
- **Quarterly**: Quality standards update

This quality monitoring ensures your data pipeline maintains high standards as it scales to multiple platforms and larger datasets.
`;
}

async function saveQualityReport(report: string) {
  try {
    await mainPrisma.report.upsert({
      where: { type: 'gyg-data-quality-report' },
      create: {
        type: 'gyg-data-quality-report',
        title: 'GYG Data Quality Report',
        content: report,
      },
      update: {
        title: 'GYG Data Quality Report',
        content: report,
      },
    });
  } catch (error) {
    console.error('Error saving quality report:', error);
  }
}

// Export for use in other scripts
export { monitorDataQuality, calculateQualityMetrics };

// Run the script
if (require.main === module) {
  monitorDataQuality().catch(console.error);
} 