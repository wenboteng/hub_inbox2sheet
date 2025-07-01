import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface PlatformComparison {
  platform: string;
  totalContent: number;
  officialContent: number;
  communityContent: number;
  avgContentLength: number;
  languages: string[];
  topCategories: string[];
  contentFreshness: number; // Days since last update
  contentQuality: {
    verified: number;
    voted: number;
    duplicates: number;
  };
}

interface CompetitiveInsights {
  platformComparisons: PlatformComparison[];
  marketLeaders: string[];
  nicheOpportunities: string[];
  contentGaps: Array<{ platform: string; gaps: string[] }>;
  strategicRecommendations: Array<{ platform: string; recommendations: string[] }>;
}

async function generateCompetitiveAnalysis(): Promise<void> {
  console.log('🏆 Generating Competitive Analysis Report...\n');

  try {
    const allArticles = await prisma.article.findMany({
      include: {
        paragraphs: true
      }
    });

    console.log(`📈 Analyzing ${allArticles.length} articles across platforms...`);

    const insights = await analyzeCompetitiveLandscape(allArticles);
    const report = createCompetitiveAnalysisReport(insights);

    const reportPath = join(process.cwd(), 'competitive-analysis-report.md');
    writeFileSync(reportPath, report, 'utf-8');

    console.log(`✅ Competitive Analysis Report generated: ${reportPath}`);
    console.log('\n📋 Report Summary:');
    console.log(`   - Platforms Analyzed: ${insights.platformComparisons.length}`);
    console.log(`   - Market Leaders: ${insights.marketLeaders.length}`);
    console.log(`   - Niche Opportunities: ${insights.nicheOpportunities.length}`);
    console.log(`   - Content Gaps Identified: ${insights.contentGaps.length}`);

  } catch (error) {
    console.error('❌ Error generating competitive analysis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function analyzeCompetitiveLandscape(articles: any[]): Promise<CompetitiveInsights> {
  const platformComparisons = await generatePlatformComparisons(articles);
  const marketLeaders = identifyMarketLeaders(platformComparisons);
  const nicheOpportunities = identifyNicheOpportunities(platformComparisons);
  const contentGaps = identifyContentGaps(platformComparisons);
  const strategicRecommendations = generateStrategicRecommendations(platformComparisons);

  return {
    platformComparisons,
    marketLeaders,
    nicheOpportunities,
    contentGaps,
    strategicRecommendations
  };
}

async function generatePlatformComparisons(articles: any[]): Promise<PlatformComparison[]> {
  const platformGroups = new Map<string, any[]>();
  
  articles.forEach(article => {
    if (!platformGroups.has(article.platform)) {
      platformGroups.set(article.platform, []);
    }
    platformGroups.get(article.platform)!.push(article);
  });

  const now = new Date();

  return Array.from(platformGroups.entries()).map(([platform, platformArticles]) => {
    const officialContent = platformArticles.filter(a => a.contentType === 'official').length;
    const communityContent = platformArticles.filter(a => a.contentType === 'community').length;
    const languages = [...new Set(platformArticles.map(a => a.language))];
    
    // Calculate average content length
    const totalLength = platformArticles.reduce((sum, article) => sum + (article.answer?.length || 0), 0);
    const avgContentLength = Math.round(totalLength / platformArticles.length);
    
    // Calculate content freshness
    const latestUpdate = Math.max(...platformArticles.map(a => new Date(a.lastUpdated).getTime()));
    const contentFreshness = Math.ceil((now.getTime() - latestUpdate) / (1000 * 60 * 60 * 24));
    
    // Get top categories
    const categoryCount = new Map<string, number>();
    platformArticles.forEach(article => {
      const category = article.category || 'Uncategorized';
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    });
    
    const topCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);
    
    // Content quality metrics
    const verified = platformArticles.filter(a => a.isVerified).length;
    const voted = platformArticles.filter(a => a.votes > 0).length;
    const duplicates = platformArticles.filter(a => a.isDuplicate).length;

    return {
      platform,
      totalContent: platformArticles.length,
      officialContent,
      communityContent,
      avgContentLength,
      languages,
      topCategories,
      contentFreshness,
      contentQuality: {
        verified,
        voted,
        duplicates
      }
    };
  }).sort((a, b) => b.totalContent - a.totalContent);
}

function identifyMarketLeaders(platforms: PlatformComparison[]): string[] {
  // Identify platforms with highest content volume and quality
  const leaders = platforms
    .filter(p => p.totalContent > 20 && p.contentQuality.verified > 0)
    .sort((a, b) => {
      // Score based on content volume, quality, and freshness
      const scoreA = (a.totalContent * 0.4) + (a.contentQuality.verified * 0.3) + (1 / (a.contentFreshness + 1) * 0.3);
      const scoreB = (b.totalContent * 0.4) + (b.contentQuality.verified * 0.3) + (1 / (b.contentFreshness + 1) * 0.3);
      return scoreB - scoreA;
    })
    .slice(0, 3)
    .map(p => p.platform);
  
  return leaders;
}

function identifyNicheOpportunities(platforms: PlatformComparison[]): string[] {
  // Identify platforms with unique characteristics or underserved areas
  const niches = platforms
    .filter(p => {
      // Platforms with unique language support
      const hasUniqueLanguages = p.languages.length > 1;
      // Platforms with strong community content
      const hasStrongCommunity = p.communityContent > p.officialContent;
      // Platforms with recent activity
      const isRecent = p.contentFreshness < 30;
      
      return hasUniqueLanguages || hasStrongCommunity || isRecent;
    })
    .map(p => p.platform);
  
  return niches;
}

function identifyContentGaps(platforms: PlatformComparison[]): Array<{ platform: string; gaps: string[] }> {
  const gaps: Array<{ platform: string; gaps: string[] }> = [];
  
  platforms.forEach(platform => {
    const platformGaps: string[] = [];
    
    // Language gaps
    if (platform.languages.length === 1) {
      platformGaps.push('Limited language support - only supports ' + platform.languages[0]);
    }
    
    // Content type gaps
    if (platform.communityContent === 0) {
      platformGaps.push('No community-generated content');
    }
    
    if (platform.officialContent === 0) {
      platformGaps.push('No official help content');
    }
    
    // Quality gaps
    if (platform.contentQuality.verified === 0) {
      platformGaps.push('No verified content');
    }
    
    if (platform.contentQuality.duplicates > platform.totalContent * 0.1) {
      platformGaps.push('High duplicate content rate');
    }
    
    // Freshness gaps
    if (platform.contentFreshness > 90) {
      platformGaps.push('Stale content - no updates in ' + platform.contentFreshness + ' days');
    }
    
    if (platformGaps.length > 0) {
      gaps.push({ platform: platform.platform, gaps: platformGaps });
    }
  });
  
  return gaps;
}

function generateStrategicRecommendations(platforms: PlatformComparison[]): Array<{ platform: string; recommendations: string[] }> {
  const recommendations: Array<{ platform: string; recommendations: string[] }> = [];
  
  platforms.forEach(platform => {
    const platformRecommendations: string[] = [];
    
    // Content volume recommendations
    if (platform.totalContent < 50) {
      platformRecommendations.push('Increase content volume - currently below industry average');
    }
    
    // Content type recommendations
    if (platform.communityContent === 0) {
      platformRecommendations.push('Develop community engagement strategy');
    }
    
    if (platform.officialContent === 0) {
      platformRecommendations.push('Create official help documentation');
    }
    
    // Language recommendations
    if (platform.languages.length === 1) {
      platformRecommendations.push('Expand to multiple languages for broader reach');
    }
    
    // Quality recommendations
    if (platform.contentQuality.verified === 0) {
      platformRecommendations.push('Implement content verification system');
    }
    
    if (platform.contentQuality.duplicates > 0) {
      platformRecommendations.push('Reduce duplicate content through better content management');
    }
    
    // Freshness recommendations
    if (platform.contentFreshness > 30) {
      platformRecommendations.push('Update content regularly - last update was ' + platform.contentFreshness + ' days ago');
    }
    
    if (platformRecommendations.length > 0) {
      recommendations.push({ platform: platform.platform, recommendations: platformRecommendations });
    }
  });
  
  return recommendations;
}

function createCompetitiveAnalysisReport(insights: CompetitiveInsights): string {
  const report = `# Competitive Analysis Report for Tour Vendors
*Generated on ${new Date().toLocaleDateString()}*

## Executive Summary

This competitive analysis examines ${insights.platformComparisons.length} major travel platforms to identify market leaders, niche opportunities, and strategic positioning for tour vendors.

## 🏆 Market Leaders

### Top 3 Platforms by Content Volume & Quality
${insights.marketLeaders.map((leader, index) => `${index + 1}. **${leader}**`).join('\n')}

## 📊 Platform Comparison Matrix

### Content Volume & Distribution
${insights.platformComparisons.map(p => `
#### ${p.platform}
- **Total Content**: ${p.totalContent.toLocaleString()} articles
- **Official Content**: ${p.officialContent} (${Math.round((p.officialContent / p.totalContent) * 100)}%)
- **Community Content**: ${p.communityContent} (${Math.round((p.communityContent / p.totalContent) * 100)}%)
- **Average Content Length**: ${p.avgContentLength.toLocaleString()} characters
- **Languages Supported**: ${p.languages.join(', ')}
- **Content Freshness**: ${p.contentFreshness} days since last update
- **Top Categories**: ${p.topCategories.join(', ')}
- **Quality Metrics**:
  - Verified Content: ${p.contentQuality.verified}
  - Voted Content: ${p.contentQuality.voted}
  - Duplicate Content: ${p.contentQuality.duplicates}
`).join('\n')}

## 🎯 Niche Opportunities

### Platforms with Unique Characteristics
${insights.nicheOpportunities.map(opportunity => `- **${opportunity}**: Unique market positioning`).join('\n')}

## 📈 Content Gaps Analysis

### Identified Gaps by Platform
${insights.contentGaps.map(gap => `
#### ${gap.platform}
${gap.gaps.map(g => `- ${g}`).join('\n')}
`).join('\n')}

## 💡 Strategic Recommendations

### Platform-Specific Strategies
${insights.strategicRecommendations.map(strategy => `
#### ${strategy.platform}
${strategy.recommendations.map(rec => `- ${rec}`).join('\n')}
`).join('\n')}

## 🚀 Competitive Positioning Strategy

### 1. Market Entry Strategy
- **Primary Target**: ${insights.marketLeaders[0] || 'Leading platform'} (highest content volume)
- **Secondary Targets**: ${insights.marketLeaders.slice(1).join(', ')}
- **Niche Opportunities**: ${insights.nicheOpportunities.join(', ')}

### 2. Content Strategy
- **Volume Approach**: Focus on platforms with < 50 articles for easier market entry
- **Quality Approach**: Target platforms with low verification rates for differentiation
- **Freshness Approach**: Prioritize platforms with stale content for competitive advantage

### 3. Language Strategy
- **Monolingual Platforms**: Opportunity for first-mover advantage in new languages
- **Multilingual Platforms**: Leverage existing language infrastructure
- **Emerging Markets**: Focus on platforms with limited language support

### 4. Community Strategy
- **Community-Heavy Platforms**: Engage with existing community for organic growth
- **Official-Heavy Platforms**: Focus on professional, verified content
- **Balanced Platforms**: Develop both official and community content strategies

## 📊 Competitive Intelligence

### Market Share Analysis
${insights.platformComparisons.map((p, index) => {
  const marketShare = Math.round((p.totalContent / insights.platformComparisons.reduce((sum, platform) => sum + platform.totalContent, 0)) * 100);
  return `- **${p.platform}**: ${marketShare}% market share (${p.totalContent} articles)`;
}).join('\n')}

### Content Quality Benchmarking
${insights.platformComparisons.map(p => {
  const qualityScore = Math.round(((p.contentQuality.verified + p.contentQuality.voted) / p.totalContent) * 100);
  return `- **${p.platform}**: ${qualityScore}% quality score`;
}).join('\n')}

### Freshness Index
${insights.platformComparisons.map(p => {
  const freshnessScore = Math.max(0, 100 - p.contentFreshness);
  return `- **${p.platform}**: ${freshnessScore}% freshness score (${p.contentFreshness} days old)`;
}).join('\n')}

## 🎯 Action Plan for Tour Vendors

### Phase 1: Market Research (Weeks 1-2)
1. **Analyze market leaders**: Study ${insights.marketLeaders.join(', ')} content strategies
2. **Identify gaps**: Focus on ${insights.contentGaps.length} identified content gaps
3. **Assess opportunities**: Evaluate ${insights.nicheOpportunities.length} niche opportunities

### Phase 2: Strategy Development (Weeks 3-4)
1. **Choose target platforms**: Select 2-3 platforms based on competitive analysis
2. **Develop content strategy**: Create platform-specific content plans
3. **Plan resource allocation**: Determine budget and team requirements

### Phase 3: Implementation (Weeks 5-12)
1. **Create content**: Develop high-quality, platform-optimized content
2. **Establish presence**: Build profiles and start content publishing
3. **Monitor performance**: Track metrics and adjust strategy

### Phase 4: Optimization (Ongoing)
1. **Analyze performance**: Compare against competitive benchmarks
2. **Refine strategy**: Adjust based on market feedback
3. **Expand presence**: Scale successful approaches to additional platforms

## 📈 Success Metrics

### Key Performance Indicators
- **Market Share**: Target ${Math.round(100 / insights.platformComparisons.length)}% share on each platform
- **Content Quality**: Achieve verification rates above platform averages
- **Freshness**: Maintain content updates within 30 days
- **Engagement**: Build community presence on community-heavy platforms

## 🔄 Continuous Monitoring

### Regular Analysis Schedule
- **Weekly**: Monitor content performance and engagement
- **Monthly**: Analyze competitive positioning and market share
- **Quarterly**: Comprehensive competitive analysis update
- **Annually**: Strategic review and planning

---

*Report generated by Hub Inbox Analytics - Your competitive intelligence partner*
`;

  return report;
}

// Run the competitive analysis
if (require.main === module) {
  generateCompetitiveAnalysis()
    .then(() => {
      console.log('\n🎉 Competitive analysis report generation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { generateCompetitiveAnalysis }; 