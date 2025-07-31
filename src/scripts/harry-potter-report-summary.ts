import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();

async function showHarryPotterReportSummary() {
  console.log('🧙‍♂️ HARRY POTTER LONDON TOURS REPORT - KEY HIGHLIGHTS\n');

  try {
    const report = await prisma.report.findFirst({
      where: { slug: 'harry-potter-london-tours-report-2025' }
    });

    if (!report) {
      console.log('❌ Harry Potter report not found');
      return;
    }

    console.log(`📄 Report Details:`);
    console.log(`   Title: ${report.title}`);
    console.log(`   ID: ${report.id}`);
    console.log(`   Created: ${report.createdAt.toLocaleDateString()}`);
    console.log(`   URL: https://otaanswers.com/reports/harry-potter-london-tours-report-2025`);

    // Extract key metrics from the report content
    const content = report.content;
    
    // Extract total activities
    const totalMatch = content.match(/Total Harry Potter Activities Analyzed:\*\* (\d+)/);
    const totalActivities = totalMatch ? totalMatch[1] : 'N/A';

    // Extract average price
    const priceMatch = content.match(/Average Price\s+\|\s+£([\d.]+)/);
    const avgPrice = priceMatch ? priceMatch[1] : 'N/A';

    // Extract average rating
    const ratingMatch = content.match(/Average Rating\s+\|\s+([\d.]+)\/5/);
    const avgRating = ratingMatch ? ratingMatch[1] : 'N/A';

    // Extract average duration
    const durationMatch = content.match(/Average Duration\|\s+([\d.]+) hours/);
    const avgDuration = durationMatch ? durationMatch[1] : 'N/A';

    // Extract price range
    const rangeMatch = content.match(/Price Range\s+\|\s+£([\d.]+) - £([\d.]+)/);
    const priceRange = rangeMatch ? `£${rangeMatch[1]} - £${rangeMatch[2]}` : 'N/A';

    console.log('\n📊 Key Market Metrics:');
    console.log(`   • Total Harry Potter Activities: ${totalActivities}`);
    console.log(`   • Average Price: £${avgPrice}`);
    console.log(`   • Average Rating: ${avgRating}/5`);
    console.log(`   • Average Duration: ${avgDuration} hours`);
    console.log(`   • Price Range: ${priceRange}`);

    // Extract top providers
    const providerSection = content.split('### Top 10 Harry Potter Tour Providers')[1]?.split('###')[0];
    if (providerSection) {
      const providerLines = providerSection.split('\n').filter(line => line.includes('|') && line.includes('TOP SIGHTS TOURS LLC'));
      if (providerLines.length > 0) {
        console.log('\n🏆 Top Provider:');
        console.log(`   • TOP SIGHTS TOURS LLC: 28 activities`);
      }
    }

    // Extract price segments
    const priceSegments = [];
    const budgetMatch = content.match(/Budget \(£0-50\)\*\*: (\d+) activities/);
    const midBudgetMatch = content.match(/Mid-Budget \(£51-100\)\*\*: (\d+) activities/);
    const midRangeMatch = content.match(/Mid-Range \(£101-200\)\*\*: (\d+) activities/);
    const premiumMatch = content.match(/Premium \(£201-500\)\*\*: (\d+) activities/);
    const luxuryMatch = content.match(/Luxury \(£500\+\)\*\*: (\d+) activities/);

    if (budgetMatch) priceSegments.push(`Budget (£0-50): ${budgetMatch[1]} activities`);
    if (midBudgetMatch) priceSegments.push(`Mid-Budget (£51-100): ${midBudgetMatch[1]} activities`);
    if (midRangeMatch) priceSegments.push(`Mid-Range (£101-200): ${midRangeMatch[1]} activities`);
    if (premiumMatch) priceSegments.push(`Premium (£201-500): ${premiumMatch[1]} activities`);
    if (luxuryMatch) priceSegments.push(`Luxury (£500+): ${luxuryMatch[1]} activities`);

    console.log('\n💰 Price Segment Distribution:');
    priceSegments.forEach(segment => {
      console.log(`   • ${segment}`);
    });

    // Extract rating distribution
    const excellentMatch = content.match(/Excellent \(4\.5-5\.0\)\*\*: (\d+) activities/);
    const goodMatch = content.match(/Good \(4\.0-4\.4\)\*\*: (\d+) activities/);
    const averageMatch = content.match(/Average \(3\.5-3\.9\)\*\*: (\d+) activities/);

    console.log('\n🌟 Rating Distribution:');
    if (excellentMatch) console.log(`   • Excellent (4.5-5.0): ${excellentMatch[1]} activities`);
    if (goodMatch) console.log(`   • Good (4.0-4.4): ${goodMatch[1]} activities`);
    if (averageMatch) console.log(`   • Average (3.5-3.9): ${averageMatch[1]} activities`);

    console.log('\n🎯 Strategic Insights:');
    console.log('   • High Demand Niche: 121 activities indicate strong market interest');
    console.log('   • Premium Pricing: Average £116.20 suggests willingness to pay for quality');
    console.log('   • Quality Focus: 4.5/5 average rating shows high customer expectations');
    console.log('   • Established Providers: Several major tour operators dominate the market');
    console.log('   • Franchise Loyalty: Harry Potter fans are highly engaged and willing to pay premium prices');

    console.log('\n🚀 Market Opportunities:');
    console.log('   • Target underserved price segments');
    console.log('   • Focus on high-rating, low-competition niches');
    console.log('   • Leverage unique Harry Potter locations and experiences');
    console.log('   • Consider partnerships with established providers');

    console.log('\n📈 Report Value for Tour Vendors:');
    console.log('   • Pricing Strategy: Position around £116.20 for competitive pricing');
    console.log('   • Duration Strategy: Focus on 4.9-hour average tour length');
    console.log('   • Quality Standards: Target 4.5+ rating to meet customer expectations');
    console.log('   • Market Entry: Identify gaps in price segments with fewer competitors');

    console.log('\n🌐 Access Information:');
    console.log(`   • Full Report: https://otaanswers.com/reports/harry-potter-london-tours-report-2025`);
    console.log(`   • Report ID: ${report.id}`);
    console.log(`   • Created: ${report.createdAt.toLocaleDateString()}`);

  } catch (error) {
    console.error('❌ Error showing Harry Potter report summary:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showHarryPotterReportSummary().catch(console.error); 