import prisma from '../lib/prisma';
import { slugify } from '../utils/slugify';

async function generateGYGCityCountryReport() {
  console.log('📊 Generating Average Price & Rating by City/Country Report...');

  await prisma.$connect();

  // Group by city and country, calculate averages and count
  const stats = await prisma.importedGYGActivity.groupBy({
    by: ['city', 'country'],
    _avg: { priceNumeric: true, ratingNumeric: true },
    _count: { id: true },
    where: {
      city: { not: null, notIn: ['', 'N/A'] },
      country: { not: null, notIn: ['', 'N/A'] },
      priceNumeric: { not: null, gt: 0 },
      ratingNumeric: { not: null, gt: 0, lte: 5 },
    },
    orderBy: [{ _count: { id: 'desc' } }],
    take: 30, // Top 30 by activity count
  });

  // Build Markdown table
  let table = '| City | Country | Avg Price (€) | Avg Rating | # Activities |\n|------|---------|--------------|------------|--------------|\n';
  for (const row of stats) {
    table += `| ${row.city} | ${row.country} | ${row._avg.priceNumeric?.toFixed(2) ?? '-'} | ${row._avg.ratingNumeric?.toFixed(2) ?? '-'} | ${row._count.id} |\n`;
  }

  // Compose report content
  const report = `\n# Average Price & Rating by City/Country (GetYourGuide Data)\n\nThis report provides a snapshot of the average tour price and customer rating for the most active cities and countries on GetYourGuide, based on our latest data import. Use these insights to benchmark your offerings and spot market opportunities.\n\n${table}\n\n**Key Insights:**\n- Cities with the most activities tend to have competitive pricing and higher review counts.\n- Use this data to compare your own prices and ratings to the local market average.\n\n*Data is updated regularly. For more detailed breakdowns or custom analysis, contact us!*\n`;

  // Save to Report table
  await prisma.report.upsert({
    where: { type: 'gyg-city-country-report' },
    create: {
      type: 'gyg-city-country-report',
      title: 'Average Price & Rating by City/Country',
      slug: slugify('Average Price & Rating by City/Country'),
      content: report,
    },
    update: {
      title: 'Average Price & Rating by City/Country',
      slug: slugify('Average Price & Rating by City/Country'),
      content: report,
    },
  });

  console.log('✅ Report generated and saved to database!');
  console.log(report);

  await prisma.$disconnect();
}

if (require.main === module) {
  generateGYGCityCountryReport().catch((err) => {
    console.error('❌ Error generating report:', err);
    process.exit(1);
  });
} 