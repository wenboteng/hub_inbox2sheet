"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs_1 = require("fs");
const path_1 = require("path");
const prisma = new client_1.PrismaClient();
async function optimizeAllReportsSEO() {
    console.log('🚀 OPTIMIZING ALL REPORTS SEO');
    console.log('=============================\n');
    try {
        // Get all public reports
        const reports = await prisma.report.findMany({
            where: { isPublic: true },
            orderBy: { updatedAt: 'desc' }
        });
        console.log(`📊 Found ${reports.length} public reports to optimize\n`);
        const optimizedReports = [];
        // Analyze each report
        for (const report of reports) {
            console.log(`🔍 Analyzing: ${report.title}`);
            const seoAnalysis = await analyzeReportSEO(report);
            optimizedReports.push(seoAnalysis);
            console.log(`   SEO Score: ${seoAnalysis.seoScore}/100`);
            console.log(`   Priority: ${seoAnalysis.priority.toUpperCase()}`);
            console.log(`   Keywords: ${seoAnalysis.keywords.length} found\n`);
        }
        // Generate comprehensive optimization report
        const optimizationReport = createComprehensiveReport(optimizedReports);
        const reportPath = (0, path_1.join)(process.cwd(), 'all-reports-seo-optimization.md');
        (0, fs_1.writeFileSync)(reportPath, optimizationReport, 'utf-8');
        // Generate individual optimization files
        for (const report of optimizedReports) {
            const individualReport = createIndividualReport(report);
            const individualPath = (0, path_1.join)(process.cwd(), `seo-${report.type}.md`);
            (0, fs_1.writeFileSync)(individualPath, individualReport, 'utf-8');
        }
        // Generate social media content calendar
        const socialMediaCalendar = createSocialMediaCalendar(optimizedReports);
        const calendarPath = (0, path_1.join)(process.cwd(), 'social-media-calendar.md');
        (0, fs_1.writeFileSync)(calendarPath, socialMediaCalendar, 'utf-8');
        console.log('🎉 ALL REPORTS SEO OPTIMIZATION COMPLETE!');
        console.log('==========================================');
        console.log(`📁 Main Report: all-reports-seo-optimization.md`);
        console.log(`📁 Individual Reports: seo-*.md files`);
        console.log(`📁 Social Calendar: social-media-calendar.md`);
        // Display summary
        console.log('\n📊 SUMMARY:');
        console.log('===========');
        const highPriority = optimizedReports.filter(r => r.priority === 'high');
        const mediumPriority = optimizedReports.filter(r => r.priority === 'medium');
        const lowPriority = optimizedReports.filter(r => r.priority === 'low');
        console.log(`🚨 High Priority: ${highPriority.length} reports`);
        console.log(`⚠️  Medium Priority: ${mediumPriority.length} reports`);
        console.log(`✅ Low Priority: ${lowPriority.length} reports`);
        console.log(`\n📈 Average SEO Score: ${Math.round(optimizedReports.reduce((sum, r) => sum + r.seoScore, 0) / optimizedReports.length)}/100`);
        // Display immediate actions
        console.log('\n🚀 IMMEDIATE ACTIONS:');
        console.log('====================');
        console.log('1. ✅ Environment variable fixed (you did this!)');
        console.log('2. 🔄 Wait for Render redeploy (2-3 minutes)');
        console.log('3. 📊 Update Google Search Console sitemap');
        console.log('4. 📱 Start social media promotion campaign');
        console.log('5. 🔗 Build internal linking between reports');
    }
    catch (error) {
        console.error('❌ Error optimizing reports:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
async function analyzeReportSEO(report) {
    const wordCount = report.content.split(' ').length;
    const keywords = extractKeywordsForReport(report);
    const seoScore = calculateSEOScore(wordCount, keywords.length, report.content);
    const priority = determinePriority(report.type, wordCount, seoScore);
    const metaDescription = generateMetaDescription(report);
    const structuredData = generateStructuredData(report);
    const socialMediaContent = generateSocialMediaContent(report);
    const indexingIssues = identifyIndexingIssues(report);
    const fixes = generateFixes(report);
    return {
        id: report.id,
        title: report.title,
        slug: report.slug,
        type: report.type,
        wordCount,
        seoScore,
        priority,
        keywords,
        metaDescription,
        structuredData,
        socialMediaContent,
        indexingIssues,
        fixes
    };
}
function extractKeywordsForReport(report) {
    const keywordMap = {
        'airbnb-ranking-algorithm': [
            'airbnb ranking algorithm 2025',
            'airbnb host tips ranking',
            'airbnb optimization guide',
            'airbnb search ranking factors',
            'airbnb superhost ranking'
        ],
        'cancellation-reasons': [
            'tour cancellation reasons 2025',
            'cancellation policy tour operators',
            'tour vendor cancellation guide',
            'travel cancellation analysis',
            'cancellation prevention strategies'
        ],
        'digital-transformation': [
            'digital transformation tour operators',
            'technology adoption travel industry',
            'booking system integration',
            'channel manager tour operators',
            'automation tour operators'
        ],
        'gyg-city-country-report': [
            'getyourguide city country report',
            'tour pricing by city',
            'travel activity pricing',
            'city country tour analysis',
            'gyg pricing data'
        ],
        'vendor': [
            'tour vendor analytics',
            'vendor performance metrics',
            'tour operator analytics',
            'vendor business intelligence',
            'tour vendor insights'
        ]
    };
    return keywordMap[report.type] || [
        'tour operator guide',
        'travel industry insights',
        'tour vendor tips',
        'travel business guide',
        'tour operator best practices'
    ];
}
function calculateSEOScore(wordCount, keywordCount, content) {
    let score = 0;
    // Word count (max 30 points)
    if (wordCount >= 2000)
        score += 30;
    else if (wordCount >= 1500)
        score += 25;
    else if (wordCount >= 1000)
        score += 15;
    else if (wordCount >= 500)
        score += 10;
    // Keywords (max 30 points)
    if (keywordCount >= 15)
        score += 30;
    else if (keywordCount >= 10)
        score += 20;
    else if (keywordCount >= 5)
        score += 10;
    // Content structure (max 20 points)
    const hasHeadings = (content.match(/^#{1,6}\s+/gm) || []).length;
    if (hasHeadings >= 10)
        score += 20;
    else if (hasHeadings >= 5)
        score += 15;
    else if (hasHeadings >= 3)
        score += 10;
    // Lists and formatting (max 20 points)
    const hasLists = (content.match(/^[-*+]\s+/gm) || []).length;
    if (hasLists >= 10)
        score += 20;
    else if (hasLists >= 5)
        score += 15;
    else if (hasLists >= 3)
        score += 10;
    return Math.min(100, score);
}
function determinePriority(type, wordCount, seoScore) {
    // High priority reports
    if (type === 'airbnb-ranking-algorithm' || type === 'cancellation-reasons') {
        return 'high';
    }
    // Medium priority based on content quality
    if (wordCount >= 1000 && seoScore >= 50) {
        return 'medium';
    }
    return 'low';
}
function generateMetaDescription(report) {
    const descriptions = {
        'airbnb-ranking-algorithm': 'Master Airbnb\'s ranking algorithm in 2025! Discover the 10 key factors that determine your listing\'s visibility. Based on analysis of 266+ host experiences.',
        'cancellation-reasons': 'Discover the top 10 cancellation reasons affecting tour vendors in 2025. Based on analysis of 125+ real cases. Learn prevention strategies to reduce cancellations.',
        'digital-transformation': 'Comprehensive guide to digital transformation for tour operators. Learn about technology adoption, booking systems, automation, and competitive advantages.',
        'gyg-city-country-report': 'GetYourGuide pricing and rating analysis by city and country. Data-driven insights for tour operators and activity providers.',
        'vendor': 'Tour vendor analytics and business intelligence report. Performance metrics and insights for tour operators and activity providers.'
    };
    return descriptions[report.type] || `Read the latest analytics and insights: ${report.title}`;
}
function generateStructuredData(report) {
    return {
        "@context": "https://schema.org",
        "@type": "Report",
        "name": report.title,
        "description": generateMetaDescription(report),
        "datePublished": report.createdAt,
        "dateModified": report.updatedAt,
        "url": `https://otaanswers.com/reports/${report.slug}`,
        "publisher": {
            "@type": "Organization",
            "name": "OTA Answers",
            "url": "https://otaanswers.com"
        },
        "author": {
            "@type": "Organization",
            "name": "OTA Answers"
        },
        "wordCount": report.content.split(' ').length
    };
}
function generateSocialMediaContent(report) {
    const templates = {
        'airbnb-ranking-algorithm': [
            '🚀 Airbnb Ranking Algorithm 2025: 10 Factors That Determine Your Success! Based on analysis of 266+ host experiences.',
            '💡 Response rate & speed are now the #1 ranking factor on Airbnb. Our comprehensive guide shows you exactly how to optimize.',
            '📊 266+ Airbnb host experiences analyzed: Here are the 10 ranking factors that matter most in 2025.'
        ],
        'cancellation-reasons': [
            '📊 Tour vendors: 12.5% of bookings end in cancellations! Discover the top 10 reasons and prevention strategies.',
            '💡 Transportation issues cause 52 cancellations across 5 platforms. Learn how to prevent this high-impact issue!',
            '💰 Cancellations cost tour vendors €2.1M annually! Our analysis reveals strategies to reduce cancellations by 25-40%.'
        ],
        'digital-transformation': [
            '🚀 Digital Transformation for Tour Operators: 924 mentions across 8 platforms reveal critical insights.',
            '💻 Technology adoption is no longer optional for tour operators. Our analysis shows the key trends for 2025.',
            '📊 74% of tour operator content mentions digital transformation topics. Are you keeping up with the competition?'
        ],
        'gyg-city-country-report': [
            '📊 GetYourGuide Pricing Analysis: City and country insights for tour operators and activity providers.',
            '💡 Data-driven pricing insights from GetYourGuide platform. Optimize your pricing strategy with real market data.',
            '📈 Tour pricing varies significantly by city and country. Get the insights you need to stay competitive.'
        ],
        'vendor': [
            '📊 Tour Vendor Analytics: Performance metrics and business intelligence for tour operators.',
            '💡 Vendor analytics insights: Track performance, optimize operations, and boost revenue.',
            '📈 Data-driven insights for tour vendors. Monitor performance and make informed business decisions.'
        ]
    };
    return templates[report.type] || [
        `📊 ${report.title}: Comprehensive analysis and insights for tour operators.`,
        `💡 New report available: ${report.title}. Get the insights you need to succeed.`,
        `📈 ${report.title}: Data-driven analysis to help tour operators optimize their business.`
    ];
}
function identifyIndexingIssues(report) {
    const issues = [
        'Page shows "Loading..." - JavaScript error preventing content display',
        'No referring sitemaps detected in Google Search Console',
        'Missing structured data markup for rich snippets',
        'Insufficient internal linking from other pages',
        'No social media promotion driving traffic'
    ];
    // Add specific issues based on content
    if (report.content.split(' ').length < 1000) {
        issues.push('Content too short for comprehensive guide');
    }
    return issues;
}
function generateFixes(report) {
    return [
        'Fix JavaScript error in report page component',
        'Submit sitemap to Google Search Console',
        'Add JSON-LD structured data markup',
        'Create internal linking strategy from related content',
        'Launch social media promotion campaign'
    ];
}
function createComprehensiveReport(reports) {
    const highPriority = reports.filter(r => r.priority === 'high');
    const mediumPriority = reports.filter(r => r.priority === 'medium');
    const lowPriority = reports.filter(r => r.priority === 'low');
    return `# 🚀 ALL REPORTS SEO OPTIMIZATION STRATEGY

*Generated on ${new Date().toLocaleDateString()}*

---

## 📊 OVERVIEW

**Total Reports**: ${reports.length}  
**High Priority**: ${highPriority.length}  
**Medium Priority**: ${mediumPriority.length}  
**Low Priority**: ${lowPriority.length}  
**Average SEO Score**: ${Math.round(reports.reduce((sum, r) => sum + r.seoScore, 0) / reports.length)}/100

---

## 🚨 HIGH PRIORITY REPORTS

${highPriority.map(report => `
### ${report.title}
- **URL**: https://otaanswers.com/reports/${report.slug}
- **SEO Score**: ${report.seoScore}/100
- **Word Count**: ${report.wordCount.toLocaleString()}
- **Keywords**: ${report.keywords.length} target keywords
- **Status**: Needs immediate attention

**Key Issues:**
${report.indexingIssues.map(issue => `- ${issue}`).join('\n')}

**Immediate Actions:**
${report.fixes.map(fix => `- [ ] ${fix}`).join('\n')}
`).join('\n')}

---

## ⚠️ MEDIUM PRIORITY REPORTS

${mediumPriority.map(report => `
### ${report.title}
- **URL**: https://otaanswers.com/reports/${report.slug}
- **SEO Score**: ${report.seoScore}/100
- **Word Count**: ${report.wordCount.toLocaleString()}
- **Keywords**: ${report.keywords.length} target keywords
- **Status**: Optimize within 30 days
`).join('\n')}

---

## ✅ LOW PRIORITY REPORTS

${lowPriority.map(report => `
### ${report.title}
- **URL**: https://otaanswers.com/reports/${report.slug}
- **SEO Score**: ${report.seoScore}/100
- **Word Count**: ${report.wordCount.toLocaleString()}
- **Keywords**: ${report.keywords.length} target keywords
- **Status**: Monitor and improve gradually
`).join('\n')}

---

## 🚀 IMPLEMENTATION STRATEGY

### Phase 1: Critical Fixes (This Week)
1. ✅ Fix environment variable (COMPLETED)
2. 🔄 Wait for Render redeploy
3. 📊 Update Google Search Console sitemap
4. 🔧 Add structured data to all report pages

### Phase 2: Content Optimization (Next 2 Weeks)
1. 📝 Expand short reports (gyg-city-country-report, vendor)
2. 🔗 Create internal linking strategy
3. 📱 Launch social media promotion campaign
4. 🎯 Optimize meta descriptions

### Phase 3: Advanced SEO (Next Month)
1. 🔍 Build backlinks from industry sites
2. 📊 Create related content cluster
3. 📈 Monitor and optimize performance
4. 🚀 Scale successful strategies

---

## 📱 SOCIAL MEDIA STRATEGY

### Week 1: High Priority Reports
${highPriority.map(report => `
**${report.title}**
${report.socialMediaContent.map(content => `- ${content}`).join('\n')}
`).join('\n')}

### Week 2: Medium Priority Reports
${mediumPriority.map(report => `
**${report.title}**
${report.socialMediaContent.map(content => `- ${content}`).join('\n')}
`).join('\n')}

---

## 🎯 SUCCESS METRICS

### Traffic Goals (Month 1)
- **Total Organic Visitors**: 5,000-10,000
- **Average Time on Page**: 3-5 minutes
- **Bounce Rate**: <40%
- **Social Shares**: 200+ total

### Ranking Goals (Month 3)
- **High Priority Reports**: Top 10 positions
- **Medium Priority Reports**: Top 20 positions
- **Low Priority Reports**: Top 30 positions

### Engagement Goals
- **Email Signups**: 500+ from report pages
- **PDF Downloads**: 200+ total
- **Social Media Engagement**: 25%+ rate

---

*This comprehensive strategy will optimize all reports simultaneously, maximizing your SEO impact and driving traffic to your entire content library.*

**Generated by OTA Answers SEO Optimization System**
`;
}
function createIndividualReport(report) {
    return `# 📊 ${report.title} - SEO Optimization Report

**URL**: https://otaanswers.com/reports/${report.slug}  
**Priority**: ${report.priority.toUpperCase()}  
**SEO Score**: ${report.seoScore}/100  
**Word Count**: ${report.wordCount.toLocaleString()}

---

## 🎯 Target Keywords

${report.keywords.map(kw => `- ${kw}`).join('\n')}

---

## 📝 Meta Description

\`\`\`
${report.metaDescription}
\`\`\`

---

## 🔧 Structured Data

\`\`\`json
${JSON.stringify(report.structuredData, null, 2)}
\`\`\`

---

## 📱 Social Media Content

${report.socialMediaContent.map((content, i) => `${i + 1}. ${content}`).join('\n\n')}

---

## 🚨 Issues & Fixes

**Issues:**
${report.indexingIssues.map(issue => `- ${issue}`).join('\n')}

**Fixes:**
${report.fixes.map(fix => `- [ ] ${fix}`).join('\n')}

---
`;
}
function createSocialMediaCalendar(reports) {
    const highPriority = reports.filter(r => r.priority === 'high');
    const mediumPriority = reports.filter(r => r.priority === 'medium');
    return `# 📱 SOCIAL MEDIA CONTENT CALENDAR

*Generated on ${new Date().toLocaleDateString()}*

---

## 🚨 WEEK 1: HIGH PRIORITY REPORTS

${highPriority.map((report, weekIndex) => `
### Day ${weekIndex + 1}: ${report.title}

**LinkedIn Post:**
${report.socialMediaContent[0]}

**Twitter Thread:**
${report.socialMediaContent[1]}

**Facebook Group Post:**
${report.socialMediaContent[2]}

**Hashtags:** #TourOperators #TravelIndustry #BusinessTips
`).join('\n')}

---

## ⚠️ WEEK 2: MEDIUM PRIORITY REPORTS

${mediumPriority.map((report, weekIndex) => `
### Day ${weekIndex + 1}: ${report.title}

**LinkedIn Post:**
${report.socialMediaContent[0]}

**Twitter Thread:**
${report.socialMediaContent[1]}

**Facebook Group Post:**
${report.socialMediaContent[2]}

**Hashtags:** #TourOperators #TravelIndustry #BusinessTips
`).join('\n')}

---

## 📅 POSTING SCHEDULE

### Daily Schedule
- **9:00 AM**: LinkedIn post
- **2:00 PM**: Twitter thread
- **6:00 PM**: Facebook group post

### Weekly Schedule
- **Monday**: High priority report
- **Tuesday**: Medium priority report
- **Wednesday**: High priority report
- **Thursday**: Medium priority report
- **Friday**: High priority report

---

## 🎯 ENGAGEMENT STRATEGY

1. **Respond to comments** within 2 hours
2. **Share relevant parts** of reports in discussions
3. **Tag relevant industry professionals**
4. **Use platform-specific hashtags**
5. **Monitor engagement and adjust strategy**

---
`;
}
if (require.main === module) {
    optimizeAllReportsSEO();
}
//# sourceMappingURL=optimize-all-reports-seo.js.map