import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface PlatformStats {
  platform: string;
  totalArticles: number;
  officialContent: number;
  communityContent: number;
  helpCenterContent: number;
  languages: string[];
  topCategories: Array<{ category: string; count: number }>;
  recentActivity: number; // Articles in last 30 days
}

interface ContentInsights {
  totalContent: number;
  platformBreakdown: PlatformStats[];
  topTopics: Array<{ topic: string; count: number; platforms: string[] }>;
  languageDistribution: Array<{ language: string; count: number; percentage: number }>;
  contentQuality: {
    verifiedContent: number;
    communityVotedContent: number;
    averageContentLength: number;
  };
  trendingTopics: Array<{ topic: string; growth: number; platforms: string[] }>;
}

interface VendorRecommendations {
  marketOpportunities: string[];
  competitiveInsights: string[];
  contentGaps: string[];
  platformStrategy: Array<{ platform: string; recommendations: string[] }>;
}

async function generateVendorAnalytics(): Promise<void> {
  console.log('📊 Generating Vendor Analytics Report...\n');

  try {
    // Get all articles
    const allArticles = await prisma.article.findMany({
      include: {
        paragraphs: true
      }
    });

    console.log(`📈 Analyzing ${allArticles.length} articles...`);

    // Generate insights
    const insights = await generateContentInsights(allArticles);
    const recommendations = await generateVendorRecommendations(allArticles, insights);

    // Create comprehensive report
    const report = createComprehensiveReport(insights, recommendations);

    // Save report
    const reportPath = join(process.cwd(), 'vendor-analytics-report.md');
    writeFileSync(reportPath, report, 'utf-8');

    console.log(`✅ Vendor Analytics Report generated: ${reportPath}`);
    console.log('\n📋 Report Summary:');
    console.log(`   - Total Content Analyzed: ${insights.totalContent.toLocaleString()}`);
    console.log(`   - Platforms Covered: ${insights.platformBreakdown.length}`);
    console.log(`   - Languages Detected: ${insights.languageDistribution.length}`);
    console.log(`   - Market Opportunities Identified: ${recommendations.marketOpportunities.length}`);

  } catch (error) {
    console.error('❌ Error generating analytics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function generateContentInsights(articles: any[]): Promise<ContentInsights> {
  const totalContent = articles.length;
  
  // Platform breakdown
  const platformStats = await generatePlatformStats(articles);
  
  // Top topics analysis
  const topTopics = analyzeTopTopics(articles);
  
  // Language distribution
  const languageDistribution = analyzeLanguageDistribution(articles);
  
  // Content quality metrics
  const contentQuality = analyzeContentQuality(articles);
  
  // Trending topics (based on recent activity)
  const trendingTopics = analyzeTrendingTopics(articles);

  return {
    totalContent,
    platformBreakdown: platformStats,
    topTopics,
    languageDistribution,
    contentQuality,
    trendingTopics
  };
}

async function generatePlatformStats(articles: any[]): Promise<PlatformStats[]> {
  const platformGroups = new Map<string, any[]>();
  
  articles.forEach(article => {
    if (!platformGroups.has(article.platform)) {
      platformGroups.set(article.platform, []);
    }
    platformGroups.get(article.platform)!.push(article);
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return Array.from(platformGroups.entries()).map(([platform, platformArticles]) => {
    const officialContent = platformArticles.filter(a => a.contentType === 'official').length;
    const communityContent = platformArticles.filter(a => a.contentType === 'community').length;
    const helpCenterContent = platformArticles.filter(a => a.source === 'help_center').length;
    const languages = Array.from(new Set(platformArticles.map(a => a.language)));
    const recentActivity = platformArticles.filter(a => new Date(a.lastUpdated) > thirtyDaysAgo).length;

    // Top categories
    const categoryCount = new Map<string, number>();
    platformArticles.forEach(article => {
      const category = article.category || 'Uncategorized';
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    });

    const topCategories = Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      platform,
      totalArticles: platformArticles.length,
      officialContent,
      communityContent,
      helpCenterContent,
      languages,
      topCategories,
      recentActivity
    };
  }).sort((a, b) => b.totalArticles - a.totalArticles);
}

function analyzeTopTopics(articles: any[]): Array<{ topic: string; count: number; platforms: string[] }> {
  const topicKeywords = [
    'cancellation', 'payment', 'booking', 'reservation', 'refund',
    'customer service', 'support', 'help', 'payout', 'commission',
    'tax', 'verification', 'security', 'account', 'password',
    'review', 'rating', 'quality', 'experience', 'tour',
    'activity', 'guide', 'host', 'guest', 'traveler'
  ];

  const topicCount = new Map<string, { count: number; platforms: Set<string> }>();

  articles.forEach(article => {
    const content = `${article.question} ${article.answer}`.toLowerCase();
    
    topicKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        if (!topicCount.has(keyword)) {
          topicCount.set(keyword, { count: 0, platforms: new Set() });
        }
        topicCount.get(keyword)!.count++;
        topicCount.get(keyword)!.platforms.add(article.platform);
      }
    });
  });

  return Array.from(topicCount.entries())
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      platforms: Array.from(data.platforms)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

function analyzeLanguageDistribution(articles: any[]): Array<{ language: string; count: number; percentage: number }> {
  const languageCount = new Map<string, number>();
  
  articles.forEach(article => {
    const lang = article.language || 'unknown';
    languageCount.set(lang, (languageCount.get(lang) || 0) + 1);
  });

  const total = articles.length;
  
  return Array.from(languageCount.entries())
    .map(([language, count]) => ({
      language,
      count,
      percentage: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.count - a.count);
}

function analyzeContentQuality(articles: any[]): { verifiedContent: number; communityVotedContent: number; averageContentLength: number } {
  const verifiedContent = articles.filter(a => a.isVerified).length;
  const communityVotedContent = articles.filter(a => a.votes > 0).length;
  
  const totalLength = articles.reduce((sum, article) => sum + (article.answer?.length || 0), 0);
  const averageContentLength = Math.round(totalLength / articles.length);

  return {
    verifiedContent,
    communityVotedContent,
    averageContentLength
  };
}

function analyzeTrendingTopics(articles: any[]): Array<{ topic: string; growth: number; platforms: string[] }> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentArticles = articles.filter(a => new Date(a.lastUpdated) > thirtyDaysAgo);
  const olderArticles = articles.filter(a => new Date(a.lastUpdated) <= thirtyDaysAgo);

  const topicKeywords = ['cancellation', 'payment', 'booking', 'payout', 'tax', 'verification'];
  const trendingTopics: Array<{ topic: string; growth: number; platforms: string[] }> = [];

  topicKeywords.forEach(topic => {
    const recentCount = recentArticles.filter(a => 
      `${a.question} ${a.answer}`.toLowerCase().includes(topic)
    ).length;
    
    const olderCount = olderArticles.filter(a => 
      `${a.question} ${a.answer}`.toLowerCase().includes(topic)
    ).length;

    if (recentCount > 0) {
      const growth = olderCount > 0 ? ((recentCount - olderCount) / olderCount) * 100 : 100;
      const platforms = Array.from(new Set(recentArticles
        .filter(a => `${a.question} ${a.answer}`.toLowerCase().includes(topic))
        .map(a => a.platform)));

      trendingTopics.push({ topic, growth: Math.round(growth), platforms });
    }
  });

  return trendingTopics.sort((a, b) => b.growth - a.growth).slice(0, 10);
}

async function generateVendorRecommendations(articles: any[], insights: ContentInsights): Promise<VendorRecommendations> {
  const marketOpportunities: string[] = [];
  const competitiveInsights: string[] = [];
  const contentGaps: string[] = [];
  const platformStrategy: Array<{ platform: string; recommendations: string[] }> = [];

  // Market opportunities based on trending topics
  insights.trendingTopics.forEach(topic => {
    if (topic.growth > 20) {
      marketOpportunities.push(`High demand for ${topic.topic} content (${topic.growth}% growth)`);
    }
  });

  // Competitive insights
  const platformStats = insights.platformBreakdown;
  const largestPlatform = platformStats[0];
  if (largestPlatform) {
    competitiveInsights.push(`${largestPlatform.platform} dominates with ${largestPlatform.totalArticles} articles`);
    competitiveInsights.push(`Community content represents ${Math.round((largestPlatform.communityContent / largestPlatform.totalArticles) * 100)}% of ${largestPlatform.platform} content`);
  }

  // Content gaps
  const allCategories = new Set<string>();
  articles.forEach(a => allCategories.add(a.category));
  const categoryArray = Array.from(allCategories);
  
  if (categoryArray.length < 10) {
    contentGaps.push('Limited category diversity - opportunity to expand into new content areas');
  }

  // Platform-specific recommendations
  platformStats.forEach(platform => {
    const recommendations: string[] = [];
    
    if (platform.communityContent > platform.officialContent) {
      recommendations.push('Focus on community engagement and user-generated content');
    }
    
    if (platform.recentActivity < platform.totalArticles * 0.1) {
      recommendations.push('Increase content freshness and regular updates');
    }
    
    if (platform.languages.length === 1) {
      recommendations.push('Consider expanding to multiple languages for broader reach');
    }

    platformStrategy.push({ platform: platform.platform, recommendations });
  });

  return {
    marketOpportunities,
    competitiveInsights,
    contentGaps,
    platformStrategy
  };
}

function createComprehensiveReport(insights: ContentInsights, recommendations: VendorRecommendations): string {
  const report = `# Tour Vendor Analytics Report
*Generated on ${new Date().toLocaleDateString()}*

## Executive Summary

This report analyzes ${insights.totalContent.toLocaleString()} pieces of content across ${insights.platformBreakdown.length} major travel platforms to provide actionable insights for tour vendors and activity providers.

## 📊 Content Overview

### Total Content Distribution
- **Total Articles**: ${insights.totalContent.toLocaleString()}
- **Platforms Covered**: ${insights.platformBreakdown.length}
- **Languages**: ${insights.languageDistribution.length}
- **Content Types**: Official Help Center, Community Discussions, User-Generated Content

### Platform Breakdown
${insights.platformBreakdown.map(platform => `
#### ${platform.platform}
- **Total Articles**: ${platform.totalArticles.toLocaleString()}
- **Official Content**: ${platform.officialContent.toLocaleString()}
- **Community Content**: ${platform.communityContent.toLocaleString()}
- **Recent Activity**: ${platform.recentActivity} articles (last 30 days)
- **Languages**: ${platform.languages.join(', ')}
- **Top Categories**: ${platform.topCategories.map(c => `${c.category} (${c.count})`).join(', ')}
`).join('\n')}

## 🎯 Key Insights

### Top Topics by Volume
${insights.topTopics.map((topic, index) => `${index + 1}. **${topic.topic}** - ${topic.count} mentions across ${topic.platforms.length} platforms`).join('\n')}

### Language Distribution
${insights.languageDistribution.map(lang => `- **${lang.language}**: ${lang.count.toLocaleString()} articles (${lang.percentage}%)`).join('\n')}

### Content Quality Metrics
- **Verified Content**: ${insights.contentQuality.verifiedContent.toLocaleString()} articles
- **Community Voted Content**: ${insights.contentQuality.communityVotedContent.toLocaleString()} articles
- **Average Content Length**: ${insights.contentQuality.averageContentLength} characters

### Trending Topics (Last 30 Days)
${insights.trendingTopics.map(topic => `- **${topic.topic}**: ${topic.growth > 0 ? '+' : ''}${topic.growth}% growth on ${topic.platforms.join(', ')}`).join('\n')}

## 💡 Market Opportunities

${recommendations.marketOpportunities.map(opp => `- ${opp}`).join('\n')}

## 🔍 Competitive Insights

${recommendations.competitiveInsights.map(insight => `- ${insight}`).join('\n')}

## 📈 Content Gaps & Opportunities

${recommendations.contentGaps.map(gap => `- ${gap}`).join('\n')}

## 🎯 Platform-Specific Recommendations

${recommendations.platformStrategy.map(strategy => `
### ${strategy.platform}
${strategy.recommendations.map(rec => `- ${rec}`).join('\n')}
`).join('\n')}

## 🚀 Strategic Recommendations for Tour Vendors

### 1. Content Strategy
- **Focus on trending topics**: Prioritize content around ${insights.trendingTopics.slice(0, 3).map(t => t.topic).join(', ')}
- **Multi-language approach**: Consider expanding beyond ${insights.languageDistribution[0]?.language || 'English'}
- **Community engagement**: Leverage user-generated content and community discussions

### 2. Platform Strategy
- **Primary focus**: ${insights.platformBreakdown[0]?.platform || 'Leading platform'} (${insights.platformBreakdown[0]?.totalArticles.toLocaleString() || 0} articles)
- **Secondary opportunities**: ${insights.platformBreakdown.slice(1, 3).map(p => p.platform).join(', ')}
- **Emerging platforms**: Monitor ${insights.platformBreakdown.slice(-2).map(p => p.platform).join(', ')}

### 3. Quality & Trust
- **Verification focus**: ${insights.contentQuality.verifiedContent.toLocaleString()} verified articles show trust is crucial
- **Community validation**: ${insights.contentQuality.communityVotedContent.toLocaleString()} community-voted articles indicate peer validation importance
- **Content depth**: Average ${insights.contentQuality.averageContentLength} characters suggests detailed content performs better

### 4. Operational Insights
- **Customer support**: ${insights.topTopics.find(t => t.topic === 'customer service')?.count || 0} customer service mentions
- **Payment concerns**: ${insights.topTopics.find(t => t.topic === 'payment')?.count || 0} payment-related discussions
- **Cancellation policies**: ${insights.topTopics.find(t => t.topic === 'cancellation')?.count || 0} cancellation mentions

## 📊 Data Methodology

This report is based on analysis of:
- **${insights.totalContent.toLocaleString()}** articles from major travel platforms
- Content spanning **${insights.languageDistribution.length}** languages
- Data collected over the past **${Math.ceil((Date.now() - new Date('2025-01-01').getTime()) / (1000 * 60 * 60 * 24))}** days
- Real-time community discussions and official help content

## 🔄 Next Steps

1. **Monitor trending topics** for content creation opportunities
2. **Engage with community discussions** on ${insights.platformBreakdown.map(p => p.platform).join(', ')}
3. **Develop multi-language content** strategy
4. **Focus on verified, high-quality content** that builds trust
5. **Track platform-specific trends** for targeted marketing

---

*Report generated by Hub Inbox Analytics - Your comprehensive travel content intelligence platform*
`;

  return report;
}

// Run the analytics
if (require.main === module) {
  generateVendorAnalytics()
    .then(() => {
      console.log('\n🎉 Analytics report generation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { generateVendorAnalytics }; 