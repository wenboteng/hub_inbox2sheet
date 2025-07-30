import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeSystemReportsPrivate() {
  console.log('🔒 Making system reports private by default...\n');

  try {
    // Comprehensive list of system/internal reports that should be private
    const systemReportTypes = [
      // Import and data processing reports
      'gyg-incremental-cleaning-report',
      'gyg-full-import-report',
      'gyg-incremental-import-report',
      'gyg-data-analysis',
      'gyg-data-cleaning-report',
      'gyg-data-quality-report',
      'gyg-import-strategy',
      'gyg-text-analysis',
      'viator-import-report',
      'madrid-activities-import-report',
      'madrid-activities-cleaning-report',
      'madrid-activities-reimport-report',
      'madrid-separate-table-import-report',
      'madrid-duplicates-cleanup-report',
      
      // Analysis and verification reports
      'vienna-activities-analysis',
      'vienna-activities-verification',
      'raw-review-data-analysis',
      'review-count-backfill-report',
      'import-process-fix-report',
      
      // Internal business reports
      'executive-summary',
      'tour-vendor-business-intelligence',
      'report-visibility-fix-summary',
      
      // Demo and test reports
      'demo',
      
      // Metadata reports
      'cancellation-reasons-metadata',
      'tour-vendor-business-intelligence-metadata',
      'competitive-analysis-metadata',
      'customer-insights-metadata',
      'vendor-analytics-metadata',
      
      // FAQ system reports
      'faq_insights',
      'faq_categories'
    ];

    console.log('🔍 Finding system reports to make private...');
    
    let privateCount = 0;
    let notFoundCount = 0;

    for (const reportType of systemReportTypes) {
      const report = await prisma.report.findFirst({
        where: { type: reportType }
      });

      if (report) {
        if (report.isPublic) {
          await prisma.report.update({
            where: { id: report.id },
            data: { isPublic: false }
          });
          console.log(`✅ Made "${report.title}" private`);
          privateCount++;
        } else {
          console.log(`ℹ️  "${report.title}" already private`);
        }
      } else {
        console.log(`⚠️  Report type "${reportType}" not found`);
        notFoundCount++;
      }
    }

    // Show current status of all reports
    console.log('\n📊 Current Report Status:');
    const allReports = await prisma.report.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    const publicReports = allReports.filter(r => r.isPublic);
    const privateReports = allReports.filter(r => !r.isPublic);

    console.log(`\n🌐 PUBLIC REPORTS (${publicReports.length}):`);
    publicReports.forEach(report => {
      console.log(`   ${report.title} (${report.type})`);
    });

    console.log(`\n🔒 PRIVATE REPORTS (${privateReports.length}):`);
    privateReports.forEach(report => {
      console.log(`   ${report.title} (${report.type})`);
    });

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Reports made private: ${privateCount}`);
    console.log(`   Reports already private: ${privateReports.length - privateCount}`);
    console.log(`   Reports not found: ${notFoundCount}`);
    console.log(`   Total system reports: ${systemReportTypes.length}`);

    console.log('\n🎉 System reports are now private by default!');
    console.log('Only user-facing reports will be visible to tour vendors.');

  } catch (error) {
    console.error('❌ Error making system reports private:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if this file is executed directly
if (require.main === module) {
  makeSystemReportsPrivate();
}

export default makeSystemReportsPrivate; 