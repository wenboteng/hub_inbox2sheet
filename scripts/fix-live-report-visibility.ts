import { mainPrisma } from '../src/lib/dual-prisma';

async function fixLiveReportVisibility() {
  console.log('🔧 FIXING LIVE REPORT VISIBILITY...\n');

  try {
    await mainPrisma.$connect();
    
    console.log('✅ Connected to database');

    // Reports that should be PRIVATE (internal/admin only)
    const reportsToMakePrivate = [
      'review-count-backfill-report',
      'import-process-fix-report', 
      'raw-review-data-analysis',
      'vienna-activities-verification',
      'vienna-activities-analysis'
    ];

    // Reports that should be PUBLIC (user-facing)
    const reportsToMakePublic = [
      'vienna-pricing-intelligence-report',
      'seasonal-pricing-intelligence',
      'vendor',
      'gyg-city-country-report',
      'cancellation-reasons',
      'airbnb-ranking-algorithm',
      'digital-transformation'
    ];

    console.log('🔒 MAKING REPORTS PRIVATE:');
    let privateCount = 0;
    for (const reportType of reportsToMakePrivate) {
      const result = await mainPrisma.report.updateMany({
        where: { 
          type: reportType,
          isPublic: true // Only update if currently public
        },
        data: { 
          isPublic: false,
          updatedAt: new Date()
        }
      });

      if (result.count > 0) {
        console.log(`   ✅ Made ${reportType} private`);
        privateCount++;
      } else {
        console.log(`   ℹ️  ${reportType} already private or not found`);
      }
    }

    console.log('\n🌐 MAKING REPORTS PUBLIC:');
    let publicCount = 0;
    for (const reportType of reportsToMakePublic) {
      const result = await mainPrisma.report.updateMany({
        where: { 
          type: reportType,
          isPublic: false // Only update if currently private
        },
        data: { 
          isPublic: true,
          updatedAt: new Date()
        }
      });

      if (result.count > 0) {
        console.log(`   ✅ Made ${reportType} public`);
        publicCount++;
      } else {
        console.log(`   ℹ️  ${reportType} already public or not found`);
      }
    }

    // Verify all changes
    console.log('\n🔍 VERIFICATION:');
    
    console.log('   PRIVATE REPORTS:');
    for (const reportType of reportsToMakePrivate) {
      const report = await mainPrisma.report.findFirst({
        where: { type: reportType },
        select: { title: true, isPublic: true }
      });

      if (report) {
        const status = report.isPublic ? '🔴 STILL PUBLIC' : '🟢 PRIVATE';
        console.log(`      ${report.title}: ${status}`);
      }
    }

    console.log('\n   PUBLIC REPORTS:');
    for (const reportType of reportsToMakePublic) {
      const report = await mainPrisma.report.findFirst({
        where: { type: reportType },
        select: { title: true, isPublic: true }
      });

      if (report) {
        const status = report.isPublic ? '🟢 PUBLIC' : '🔴 PRIVATE';
        console.log(`      ${report.title}: ${status}`);
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Reports made private: ${privateCount}`);
    console.log(`   Reports made public: ${publicCount}`);
    console.log(`   Total changes: ${privateCount + publicCount}`);

    // Create a summary report
    const summaryReport = `
# Report Visibility Fix Summary

**Generated**: ${new Date().toISOString()}
**Total Changes**: ${privateCount + publicCount}

## Reports Made Private (Internal/Admin Only)
${reportsToMakePrivate.map(type => `- ${type}`).join('\n')}

## Reports Made Public (User-Facing)
${reportsToMakePublic.map(type => `- ${type}`).join('\n')}

## Impact
- **Private Reports**: ${privateCount} reports are now internal/admin only
- **Public Reports**: ${publicCount} reports are now user-facing
- **Vienna Pricing Report**: Remains public and accessible to users
- **Internal Reports**: No longer accessible via public API

## URLs Affected
- Private reports will return 404 on public URLs
- Public reports remain accessible at /reports/[slug]
- Admin interface still shows all reports with visibility controls

---
*This fix ensures proper separation between internal and public reports.*
`;

    // Save the summary report
    await mainPrisma.report.upsert({
      where: { type: 'report-visibility-fix-summary' },
      create: {
        type: 'report-visibility-fix-summary',
        title: 'Report Visibility Fix Summary',
        slug: 'report-visibility-fix-summary',
        content: summaryReport,
        isPublic: false, // This is an internal report
      },
      update: {
        title: 'Report Visibility Fix Summary',
        slug: 'report-visibility-fix-summary',
        content: summaryReport,
        isPublic: false,
      },
    });

    console.log('\n✅ Summary report saved to database');
    console.log('\n🚀 DEPLOYMENT REQUIRED:');
    console.log('   The database changes are now applied locally.');
    console.log('   To apply to live environment:');
    console.log('   git add .');
    console.log('   git commit -m "Fix report visibility - make internal reports private"');
    console.log('   git push origin main');
    console.log('');
    console.log('   After deployment, private reports will no longer be accessible publicly.');

    return {
      privateCount,
      publicCount,
      totalChanges: privateCount + publicCount
    };

  } catch (error) {
    console.error('❌ Error fixing report visibility:', error);
    throw error;
  } finally {
    await mainPrisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  fixLiveReportVisibility().catch(console.error);
}

export { fixLiveReportVisibility }; 