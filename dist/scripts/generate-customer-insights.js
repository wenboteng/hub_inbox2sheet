"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCustomerInsights = generateCustomerInsights;
const client_1 = require("@prisma/client");
const fs_1 = require("fs");
const path_1 = require("path");
const prisma = new client_1.PrismaClient();
async function generateCustomerInsights() {
    console.log('🔍 Generating Customer Insights Report...\n');
    try {
        const allArticles = await prisma.article.findMany({
            include: {
                paragraphs: true
            }
        });
        console.log(`📈 Analyzing ${allArticles.length} customer questions...`);
        const insights = await analyzeCustomerBehavior(allArticles);
        const report = createCustomerInsightsReport(insights);
        const reportPath = (0, path_1.join)(process.cwd(), 'customer-insights-report.md');
        (0, fs_1.writeFileSync)(reportPath, report, 'utf-8');
        console.log(`✅ Customer Insights Report generated: ${reportPath}`);
        console.log('\n📋 Report Summary:');
        console.log(`   - Total Questions Analyzed: ${insights.totalQuestions.toLocaleString()}`);
        console.log(`   - Pain Points Identified: ${insights.painPoints.length}`);
        console.log(`   - Top Questions: ${insights.topQuestions.length}`);
        console.log(`   - Platforms Covered: ${insights.platformPreferences.length}`);
    }
    catch (error) {
        console.error('❌ Error generating customer insights:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
async function analyzeCustomerBehavior(articles) {
    const totalQuestions = articles.length;
    // Analyze pain points
    const painPoints = analyzePainPoints(articles);
    // Get top questions
    const topQuestions = getTopQuestions(articles);
    // Platform preferences
    const platformPreferences = analyzePlatformPreferences(articles);
    // Language breakdown
    const languageBreakdown = analyzeLanguageBreakdown(articles);
    // Category analysis
    const categoryAnalysis = analyzeCategories(articles);
    return {
        totalQuestions,
        painPoints,
        topQuestions,
        platformPreferences,
        languageBreakdown,
        categoryAnalysis
    };
}
function analyzePainPoints(articles) {
    const painPointKeywords = {
        'cancellation': { sentiment: 'negative', urgency: 'high' },
        'refund': { sentiment: 'negative', urgency: 'high' },
        'problem': { sentiment: 'negative', urgency: 'medium' },
        'issue': { sentiment: 'negative', urgency: 'medium' },
        'error': { sentiment: 'negative', urgency: 'high' },
        'failed': { sentiment: 'negative', urgency: 'high' },
        'broken': { sentiment: 'negative', urgency: 'high' },
        'not working': { sentiment: 'negative', urgency: 'high' },
        'can\'t': { sentiment: 'negative', urgency: 'medium' },
        'unable': { sentiment: 'negative', urgency: 'medium' },
        'confused': { sentiment: 'neutral', urgency: 'low' },
        'help': { sentiment: 'neutral', urgency: 'medium' },
        'support': { sentiment: 'neutral', urgency: 'medium' },
        'question': { sentiment: 'neutral', urgency: 'low' },
        'how to': { sentiment: 'neutral', urgency: 'low' }
    };
    const painPointCount = new Map();
    articles.forEach(article => {
        const content = `${article.question} ${article.answer}`.toLowerCase();
        Object.entries(painPointKeywords).forEach(([keyword, config]) => {
            if (content.includes(keyword)) {
                if (!painPointCount.has(keyword)) {
                    painPointCount.set(keyword, {
                        count: 0,
                        platforms: new Set(),
                        sentiment: config.sentiment,
                        urgency: config.urgency
                    });
                }
                painPointCount.get(keyword).count++;
                painPointCount.get(keyword).platforms.add(article.platform);
            }
        });
    });
    return Array.from(painPointCount.entries())
        .map(([topic, data]) => ({
        topic,
        frequency: data.count,
        platforms: Array.from(data.platforms),
        sentiment: data.sentiment,
        urgency: data.urgency
    }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 15);
}
function getTopQuestions(articles) {
    return articles
        .map(article => ({
        question: article.question,
        category: article.category,
        platform: article.platform,
        language: article.language,
        contentLength: article.answer?.length || 0
    }))
        .sort((a, b) => b.contentLength - a.contentLength)
        .slice(0, 20);
}
function analyzePlatformPreferences(articles) {
    const platformCount = new Map();
    articles.forEach(article => {
        platformCount.set(article.platform, (platformCount.get(article.platform) || 0) + 1);
    });
    const total = articles.length;
    return Array.from(platformCount.entries())
        .map(([platform, count]) => ({
        platform,
        questionCount: count,
        percentage: Math.round((count / total) * 100)
    }))
        .sort((a, b) => b.questionCount - a.questionCount);
}
function analyzeLanguageBreakdown(articles) {
    const languageCount = new Map();
    articles.forEach(article => {
        const lang = article.language || 'unknown';
        languageCount.set(lang, (languageCount.get(lang) || 0) + 1);
    });
    const total = articles.length;
    return Array.from(languageCount.entries())
        .map(([language, count]) => ({
        language,
        questionCount: count,
        percentage: Math.round((count / total) * 100)
    }))
        .sort((a, b) => b.questionCount - a.questionCount);
}
function analyzeCategories(articles) {
    const categoryData = new Map();
    articles.forEach(article => {
        const category = article.category || 'Uncategorized';
        const length = article.answer?.length || 0;
        if (!categoryData.has(category)) {
            categoryData.set(category, { count: 0, totalLength: 0 });
        }
        categoryData.get(category).count++;
        categoryData.get(category).totalLength += length;
    });
    return Array.from(categoryData.entries())
        .map(([category, data]) => ({
        category,
        questionCount: data.count,
        avgLength: Math.round(data.totalLength / data.count)
    }))
        .sort((a, b) => b.questionCount - a.questionCount)
        .slice(0, 10);
}
function createCustomerInsightsReport(insights) {
    const report = `# Customer Insights Report for Tour Vendors
*Generated on ${new Date().toLocaleDateString()}*

## Executive Summary

This report analyzes ${insights.totalQuestions.toLocaleString()} customer questions and interactions across major travel platforms to help tour vendors understand customer pain points, preferences, and behavior patterns.

## 🎯 Customer Pain Points Analysis

### High Urgency Issues (Immediate Attention Required)
${insights.painPoints
        .filter(p => p.urgency === 'high')
        .map(p => `- **${p.topic}**: ${p.frequency} mentions across ${p.platforms.length} platforms (${p.sentiment} sentiment)`)
        .join('\n')}

### Medium Urgency Issues (Plan to Address)
${insights.painPoints
        .filter(p => p.urgency === 'medium')
        .map(p => `- **${p.topic}**: ${p.frequency} mentions across ${p.platforms.length} platforms (${p.sentiment} sentiment)`)
        .join('\n')}

### Low Urgency Issues (Monitor Trends)
${insights.painPoints
        .filter(p => p.urgency === 'low')
        .map(p => `- **${p.topic}**: ${p.frequency} mentions across ${p.platforms.length} platforms (${p.sentiment} sentiment)`)
        .join('\n')}

## 📊 Platform Preferences

### Where Customers Ask Questions
${insights.platformPreferences.map(p => `- **${p.platform}**: ${p.questionCount} questions (${p.percentage}%)`).join('\n')}

### Language Distribution
${insights.languageBreakdown.map(l => `- **${l.language}**: ${l.questionCount} questions (${l.percentage}%)`).join('\n')}

## 🔍 Top Customer Questions

### Most Detailed Questions (by content length)
${insights.topQuestions.slice(0, 10).map((q, index) => `${index + 1}. **${q.question}** (${q.platform}, ${q.language}, ${q.contentLength} chars)`).join('\n')}

## 📈 Category Analysis

### Question Distribution by Category
${insights.categoryAnalysis.map(c => `- **${c.category}**: ${c.questionCount} questions (avg ${c.avgLength} chars)`).join('\n')}

## 💡 Key Insights for Tour Vendors

### 1. Customer Support Priorities
- **High Priority**: Focus on ${insights.painPoints.filter(p => p.urgency === 'high').slice(0, 3).map(p => p.topic).join(', ')}
- **Medium Priority**: Address ${insights.painPoints.filter(p => p.urgency === 'medium').slice(0, 3).map(p => p.topic).join(', ')}
- **Monitor**: Track ${insights.painPoints.filter(p => p.urgency === 'low').slice(0, 3).map(p => p.topic).join(', ')}

### 2. Platform Strategy
- **Primary Platform**: ${insights.platformPreferences[0]?.platform || 'Leading platform'} (${insights.platformPreferences[0]?.percentage || 0}% of questions)
- **Secondary Platforms**: ${insights.platformPreferences.slice(1, 3).map(p => p.platform).join(', ')}
- **Emerging Opportunities**: ${insights.platformPreferences.slice(-2).map(p => p.platform).join(', ')}

### 3. Language Strategy
- **Primary Language**: ${insights.languageBreakdown[0]?.language || 'English'} (${insights.languageBreakdown[0]?.percentage || 0}% of questions)
- **Secondary Languages**: ${insights.languageBreakdown.slice(1, 3).map(l => l.language).join(', ')}
- **Expansion Opportunities**: ${insights.languageBreakdown.slice(-2).map(l => l.language).join(', ')}

### 4. Content Strategy
- **Most Detailed Questions**: ${insights.categoryAnalysis[0]?.category || 'Top category'} (avg ${insights.categoryAnalysis[0]?.avgLength || 0} chars)
- **Quick Questions**: ${insights.categoryAnalysis.slice(-1)[0]?.category || 'Bottom category'} (avg ${insights.categoryAnalysis.slice(-1)[0]?.avgLength || 0} chars)

## 🚀 Actionable Recommendations

### Immediate Actions (Next 30 Days)
1. **Address High-Urgency Pain Points**: Create content and processes for ${insights.painPoints.filter(p => p.urgency === 'high').slice(0, 2).map(p => p.topic).join(', ')}
2. **Platform Optimization**: Optimize presence on ${insights.platformPreferences[0]?.platform || 'leading platform'}
3. **Language Expansion**: Consider adding support for ${insights.languageBreakdown.slice(1, 2).map(l => l.language).join(', ')}

### Medium-Term Strategy (Next 90 Days)
1. **Content Development**: Create comprehensive guides for ${insights.categoryAnalysis.slice(0, 3).map(c => c.category).join(', ')}
2. **Multi-Platform Presence**: Expand to ${insights.platformPreferences.slice(1, 3).map(p => p.platform).join(', ')}
3. **Customer Education**: Develop FAQ sections for ${insights.painPoints.filter(p => p.urgency === 'medium').slice(0, 3).map(p => p.topic).join(', ')}

### Long-Term Planning (Next 6 Months)
1. **Global Expansion**: Plan for ${insights.languageBreakdown.slice(-2).map(l => l.language).join(', ')} language support
2. **Platform Diversification**: Explore opportunities on ${insights.platformPreferences.slice(-2).map(p => p.platform).join(', ')}
3. **Proactive Support**: Implement systems to address ${insights.painPoints.filter(p => p.urgency === 'low').slice(0, 3).map(p => p.topic).join(', ')}

## 📊 Data Methodology

This report analyzes:
- **${insights.totalQuestions.toLocaleString()}** customer questions
- **${insights.painPoints.length}** identified pain points
- **${insights.platformPreferences.length}** platforms
- **${insights.languageBreakdown.length}** languages
- Content from the past **${Math.ceil((Date.now() - new Date('2025-01-01').getTime()) / (1000 * 60 * 60 * 24))}** days

## 🔄 Next Steps

1. **Prioritize pain points** by urgency and frequency
2. **Optimize platform presence** based on customer preferences
3. **Develop multilingual content** for broader reach
4. **Create proactive support systems** to address common issues
5. **Monitor trends** in customer questions and pain points

---

*Report generated by Hub Inbox Analytics - Understanding your customers better*
`;
    return report;
}
// Run the customer insights
if (require.main === module) {
    generateCustomerInsights()
        .then(() => {
        console.log('\n🎉 Customer insights report generation completed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=generate-customer-insights.js.map