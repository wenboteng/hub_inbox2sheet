import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDigitalTransformationData() {
  try {
    console.log('🔍 Analyzing Digital Transformation Data...\n');

    // Check total articles
    const totalArticles = await prisma.article.count();
    console.log('📊 Total Articles:', totalArticles);
    
    // Check articles by platform
    const platformStats = await prisma.article.groupBy({
      by: ['platform'],
      _count: { platform: true }
    });
    console.log('\n📈 Articles by Platform:');
    platformStats.forEach(stat => {
      console.log(`  ${stat.platform}: ${stat._count.platform}`);
    });
    
    // Check articles mentioning digital transformation keywords
    const digitalKeywords = [
      'digital', 'technology', 'automation', 'software', 'app', 'online', 'system',
      'platform', 'integration', 'api', 'cloud', 'mobile', 'web', 'database',
      'analytics', 'dashboard', 'management', 'booking', 'reservation', 'payment',
      'crm', 'erp', 'pos', 'inventory', 'marketing', 'social media', 'email',
      'website', 'ecommerce', 'marketplace', 'channel manager', 'pms'
    ];
    
    const digitalTransformationArticles = await prisma.article.findMany({
      where: {
        OR: digitalKeywords.map(keyword => ({
          OR: [
            { question: { contains: keyword, mode: 'insensitive' } },
            { answer: { contains: keyword, mode: 'insensitive' } }
          ]
        }))
      },
      include: {
        paragraphs: true
      }
    });
    
    console.log(`\n💻 Digital Transformation Related Articles: ${digitalTransformationArticles.length}`);
    
    // Group by platform
    const digitalByPlatform = digitalTransformationArticles.reduce((acc, article) => {
      acc[article.platform] = (acc[article.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📱 Digital Transformation Articles by Platform:');
    Object.entries(digitalByPlatform).forEach(([platform, count]) => {
      console.log(`  ${platform}: ${count}`);
    });
    
    // Show sample articles
    console.log('\n📝 Sample Digital Transformation Articles:');
    digitalTransformationArticles.slice(0, 10).forEach(article => {
      console.log(`\n  Platform: ${article.platform}`);
      console.log(`  Question: ${article.question.substring(0, 150)}...`);
      console.log(`  Category: ${article.category}`);
      console.log(`  Content Type: ${article.contentType}`);
      console.log(`  Source: ${article.source}`);
    });
    
    // Check for specific technology mentions
    const techTerms = ['booking system', 'channel manager', 'pms', 'crm', 'automation', 'integration'];
    console.log('\n🔧 Specific Technology Mentions:');
    
    for (const term of techTerms) {
      const count = await prisma.article.count({
        where: {
          OR: [
            { question: { contains: term, mode: 'insensitive' } },
            { answer: { contains: term, mode: 'insensitive' } }
          ]
        }
      });
      console.log(`  ${term}: ${count} articles`);
    }
    
    await prisma.$disconnect();
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkDigitalTransformationData();
} 