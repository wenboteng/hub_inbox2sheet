import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDeploymentStatus(): Promise<void> {
  console.log('🔍 DEPLOYMENT STATUS CHECKER');
  console.log('============================');
  console.log(`⏰ Checked at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Check database connection
    console.log('📊 Checking database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Check total articles
    const articleCount = await prisma.article.count();
    console.log(`📈 Total articles in database: ${articleCount.toLocaleString()}`);

    // Check reports in database
    console.log('\n📋 Checking reports in database...');
    const reports = await prisma.report.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    console.log(`📊 Total reports in database: ${reports.length}`);
    
    if (reports.length === 0) {
      console.log('❌ No reports found in database');
      console.log('💡 This might be why the /reports page is not working');
    } else {
      console.log('\n📋 Reports found:');
      reports.forEach((report, index) => {
        const status = report.isPublic ? '✅ PUBLIC' : '🔒 PRIVATE';
        const daysOld = Math.round((Date.now() - report.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`  ${index + 1}. ${status} ${report.title} (${daysOld} days old)`);
      });
    }

    // Check if critical reports exist
    const criticalReports = [
      'vendor-analytics',
      'customer-insights', 
      'competitive-analysis',
      'executive-summary',
      'tour-vendor-business-intelligence',
      'cancellation-reasons'
    ];

    console.log('\n🎯 Checking critical reports...');
    for (const reportType of criticalReports) {
      const report = await prisma.report.findUnique({
        where: { type: reportType }
      });
      
      if (report) {
        console.log(`  ✅ ${reportType}: Found (${report.isPublic ? 'PUBLIC' : 'PRIVATE'})`);
      } else {
        console.log(`  ❌ ${reportType}: Missing`);
      }
    }

    // Check platform distribution
    console.log('\n🏢 Platform distribution:');
    const platformStats = await prisma.article.groupBy({
      by: ['platform'],
      _count: { platform: true }
    });

    platformStats.forEach(stat => {
      console.log(`  ${stat.platform}: ${stat._count.platform.toLocaleString()} articles`);
    });

  } catch (error) {
    console.error('❌ Error checking deployment status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the status checker
if (require.main === module) {
  checkDeploymentStatus()
    .then(() => {
      console.log('\n🎉 Deployment status check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Deployment status check failed:', error);
      process.exit(1);
    });
}

export { checkDeploymentStatus }; 