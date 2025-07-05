import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeOTAData() {
  console.log('🔍 DEEP OTA ALGORITHM INSIGHT SEARCH...\n');

  try {
    // 1. Get total counts by platform
    console.log('1. PLATFORM BREAKDOWN:');
    const platformStats = await prisma.article.groupBy({
      by: ['platform'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    platformStats.forEach(stat => {
      console.log(`   ${stat.platform}: ${stat._count.id} articles`);
    });

    // 2. Deep search for algorithm-related and indirect keywords
    console.log('\n2. DEEP SEARCH FOR ALGORITHM-RELATED INSIGHTS:');
    const deepKeywords = [
      'algorithm', 'rank', 'ranking', 'search', 'visibility', 'boost', 'promote',
      'seo', 'optimi', 'listing', 'performance', 'metric', 'score',
      'relev', 'match', 'recommend', 'suggest', 'featured',
      'priority', 'placement', 'position', 'sort', 'filter', 'sorting',
      'views', 'bookings', 'conversion', 'traffic', 'exposure',
      'appear', 'show', 'display', 'find', 'discover', 'best', 'top', 'first',
      'popular', 'trending', 'hot', 'featured', 'hidden', 'not showing',
      'why is my listing', 'how to get more bookings', 'listing not visible',
      'increase bookings', 'get more guests', 'improve ranking', 'search result',
      'algorithm change', 'update', 'penalty', 'demoted', 'suspended', 'shadowban',
      'airbnb algorithm', 'viator algorithm', 'getyourguide algorithm', 'expedia algorithm', 'booking algorithm'
    ];

    // Use a broad OR search for all keywords in question or answer
    const deepArticles = await prisma.article.findMany({
      where: {
        OR: deepKeywords.map(keyword => ([
          { question: { contains: keyword, mode: 'insensitive' } },
          { answer: { contains: keyword, mode: 'insensitive' } }
        ])).flat()
      },
      select: {
        id: true,
        platform: true,
        category: true,
        question: true,
        url: true,
        lastUpdated: true
      },
      orderBy: {
        lastUpdated: 'desc'
      }
    });

    console.log(`   Found ${deepArticles.length} articles with direct or indirect algorithm-related content.`);
    if (deepArticles.length > 0) {
      // Group by platform
      const byPlatform = deepArticles.reduce((acc, article) => {
        if (!acc[article.platform]) acc[article.platform] = [];
        acc[article.platform].push(article);
        return acc;
      }, {} as Record<string, typeof deepArticles>);
      Object.entries(byPlatform).forEach(([platform, articles]) => {
        console.log(`\n   ${platform} (${articles.length} articles):`);
        articles.slice(0, 5).forEach(article => {
          console.log(`     - ${article.question.substring(0, 100)}...`);
          console.log(`       Category: ${article.category}`);
          console.log(`       URL: ${article.url}`);
        });
        if (articles.length > 5) {
          console.log(`     ... and ${articles.length - 5} more`);
        }
      });
    } else {
      console.log('   No direct or indirect algorithm-related content found.');
    }

    // 3. Suggest sources for future data collection if not enough found
    console.log('\n3. SUGGESTIONS FOR FUTURE OTA ALGORITHM DATA COLLECTION:');
    if (deepArticles.length < 10) {
      console.log('   Not enough OTA algorithm-related data found in current content.');
      console.log('   Suggestions:');
      console.log('   - Scrape OTA help centers and official blogs for algorithm updates and ranking tips.');
      console.log('   - Monitor OTA community forums for host/guest discussions about search, ranking, and visibility.');
      console.log('   - Collect and analyze OTA newsletters and product update emails.');
      console.log('   - Interview hosts or suppliers about their experience with listing visibility and ranking.');
      console.log('   - Track changes in listing performance after major OTA updates.');
      console.log('   - Use web scraping to monitor FAQ and support articles for algorithm-related changes.');
    } else {
      console.log('   Sufficient data found for a preliminary OTA algorithm report.');
    }

    // 4. Summary
    console.log('\n4. SUMMARY:');
    console.log(`   Total articles: ${await prisma.article.count()}`);
    console.log(`   Deep algorithm-related articles: ${deepArticles.length}`);
  } catch (error) {
    console.error('Error analyzing OTA data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeOTAData(); 