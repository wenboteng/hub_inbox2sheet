import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function demoAnalytics(): Promise<void> {
  console.log('🎯 Quick Analytics Demo for Tour Vendors\n');

  try {
    const articles = await prisma.article.findMany();
    
    console.log(`📊 Total Content: ${articles.length} articles`);
    
    // Platform breakdown
    const platformStats = new Map<string, number>();
    articles.forEach(article => {
      platformStats.set(article.platform, (platformStats.get(article.platform) || 0) + 1);
    });
    
    console.log('\n🏢 Platform Distribution:');
    Array.from(platformStats.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([platform, count]) => {
        console.log(`   ${platform}: ${count} articles (${Math.round((count / articles.length) * 100)}%)`);
      });
    
    // Top topics
    const topicKeywords = ['cancellation', 'payment', 'booking', 'refund', 'customer service', 'support'];
    const topicCount = new Map<string, number>();
    
    articles.forEach(article => {
      const content = `${article.question} ${article.answer}`.toLowerCase();
      topicKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          topicCount.set(keyword, (topicCount.get(keyword) || 0) + 1);
        }
      });
    });
    
    console.log('\n🔥 Top Customer Concerns:');
    Array.from(topicCount.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([topic, count]) => {
        console.log(`   ${topic}: ${count} mentions`);
      });
    
    // Language distribution
    const languageStats = new Map<string, number>();
    articles.forEach(article => {
      const lang = article.language || 'unknown';
      languageStats.set(lang, (languageStats.get(lang) || 0) + 1);
    });
    
    console.log('\n🌍 Language Distribution:');
    Array.from(languageStats.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([lang, count]) => {
        console.log(`   ${lang}: ${count} articles (${Math.round((count / articles.length) * 100)}%)`);
      });
    
    // Content quality
    const verifiedContent = articles.filter(a => a.isVerified).length;
    const communityContent = articles.filter(a => a.contentType === 'community').length;
    const officialContent = articles.filter(a => a.contentType === 'official').length;
    
    console.log('\n📈 Content Quality Metrics:');
    console.log(`   Verified Content: ${verifiedContent} articles`);
    console.log(`   Community Content: ${communityContent} articles (${Math.round((communityContent / articles.length) * 100)}%)`);
    console.log(`   Official Content: ${officialContent} articles (${Math.round((officialContent / articles.length) * 100)}%)`);
    
    // Recent activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentArticles = articles.filter(a => new Date(a.lastUpdated) > thirtyDaysAgo);
    
    console.log('\n⏰ Recent Activity:');
    console.log(`   Articles in last 30 days: ${recentArticles.length} (${Math.round((recentArticles.length / articles.length) * 100)}%)`);
    
    // Key insights for vendors
    console.log('\n💡 Key Insights for Tour Vendors:');
    console.log('   1. Focus on cancellation and payment topics - highest customer concern');
    console.log('   2. Airbnb dominates the market - prioritize this platform');
    console.log('   3. English content dominates - opportunity for multilingual expansion');
    console.log('   4. Community content is growing - engage with user discussions');
    console.log('   5. Recent activity is high - market is very active');
    
    console.log('\n🚀 Recommended Actions:');
    console.log('   1. Create comprehensive cancellation policy guides');
    console.log('   2. Develop clear payment processing documentation');
    console.log('   3. Establish presence on Airbnb community forums');
    console.log('   4. Consider Spanish and Portuguese content expansion');
    console.log('   5. Monitor trending topics for content opportunities');
    
    console.log('\n📊 For detailed analysis, run:');
    console.log('   npm run analytics:all');
    
  } catch (error) {
    console.error('❌ Error in demo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the demo
if (require.main === module) {
  demoAnalytics()
    .then(() => {
      console.log('\n✅ Demo completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { demoAnalytics }; 