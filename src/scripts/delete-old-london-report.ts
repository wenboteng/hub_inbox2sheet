import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();

async function deleteOldLondonReport() {
  console.log('🗑️ DELETING OLD LONDON MARKET INTELLIGENCE REPORT 2024...\n');

  try {
    // Find the old 2024 report
    const oldReport = await prisma.report.findFirst({
      where: { 
        slug: 'london-market-intelligence-report-2024'
      }
    });

    if (!oldReport) {
      console.log('❌ Old London report 2024 not found - it may have already been deleted');
      return;
    }

    console.log(`📄 Found old report:`);
    console.log(`   ID: ${oldReport.id}`);
    console.log(`   Title: ${oldReport.title}`);
    console.log(`   Slug: ${oldReport.slug}`);
    console.log(`   Created: ${oldReport.createdAt.toLocaleDateString()}`);

    // Delete the old report
    await prisma.report.delete({
      where: { id: oldReport.id }
    });

    console.log('\n✅ Old London Market Intelligence Report 2024 deleted successfully!');
    console.log('📊 Now you only have the fresh 2025 version with updated data');

    // Verify the 2025 report still exists
    const newReport = await prisma.report.findFirst({
      where: { 
        slug: 'london-market-intelligence-report-2025'
      }
    });

    if (newReport) {
      console.log('\n✅ Confirmed: London Market Intelligence Report 2025 is still available');
      console.log(`   ID: ${newReport.id}`);
      console.log(`   Title: ${newReport.title}`);
      console.log(`   Slug: ${newReport.slug}`);
      console.log(`   URL: https://otaanswers.com/reports/london-market-intelligence-report-2025`);
    }

  } catch (error) {
    console.error('❌ Error deleting old London report:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteOldLondonReport().catch(console.error); 