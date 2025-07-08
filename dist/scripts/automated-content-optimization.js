"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automatedContentOptimization = automatedContentOptimization;
const client_1 = require("@prisma/client");
const fs_1 = require("fs");
const path_1 = require("path");
const prisma = new client_1.PrismaClient();
async function automatedContentOptimization() {
    console.log('🔧 AUTOMATED CONTENT OPTIMIZATION SYSTEM\n');
    try {
        // Get articles for optimization
        const articles = await prisma.article.findMany({
            select: {
                id: true,
                question: true,
                answer: true,
                slug: true,
                platform: true,
                category: true,
                contentType: true,
                createdAt: true,
                updatedAt: true
            },
            where: {
                crawlStatus: 'active'
            }
        });
        // Define target keywords for each platform
        const platformKeywords = {
            'airbnb': [
                'airbnb host', 'airbnb cancellation', 'airbnb payout', 'airbnb dashboard',
                'airbnb policy', 'airbnb booking', 'airbnb guest', 'airbnb listing'
            ],
            'viator': [
                'viator partner', 'viator payment', 'viator booking', 'viator supplier',
                'viator portal', 'viator commission', 'viator support', 'viator dashboard'
            ],
            'getyourguide': [
                'getyourguide partner', 'getyourguide payment', 'getyourguide booking',
                'getyourguide dashboard', 'getyourguide policy', 'getyourguide support'
            ],
            'tripadvisor': [
                'tripadvisor experiences', 'tripadvisor booking', 'tripadvisor partner',
                'tripadvisor policy', 'tripadvisor support', 'tripadvisor dashboard'
            ],
            'general': [
                'tour operator', 'tour booking', 'tour cancellation', 'tour payment',
                'tour policy', 'tour guide', 'tour software', 'tour platform'
            ]
        };
        const optimizations = [];
        articles.forEach(article => {
            const content = `${article.question} ${article.answer}`.toLowerCase();
            const platform = article.platform.toLowerCase();
            // Get relevant keywords for this platform
            const relevantKeywords = [
                ...(platformKeywords[platform] || []),
                ...platformKeywords.general
            ];
            // Analyze SEO factors
            const seoAnalysis = {
                hasMetaDescription: article.question.length > 50 && article.question.length < 160,
                hasTargetKeywords: relevantKeywords.some(keyword => content.includes(keyword)),
                hasInternalLinks: content.includes('http') || content.includes('www'),
                hasSchemaMarkup: false, // Would check actual schema markup
                contentLength: content.length,
                readabilityScore: calculateReadabilityScore(content),
                keywordDensity: calculateKeywordDensity(content, relevantKeywords)
            };
            // Calculate current SEO score
            const currentScore = calculateSEOScore(seoAnalysis);
            // Generate improvements
            const improvements = [];
            if (!seoAnalysis.hasMetaDescription) {
                improvements.push('Add meta description (50-160 characters)');
            }
            if (!seoAnalysis.hasTargetKeywords) {
                improvements.push(`Include target keywords: ${relevantKeywords.slice(0, 3).join(', ')}`);
            }
            if (!seoAnalysis.hasInternalLinks) {
                improvements.push('Add internal links to related articles');
            }
            if (seoAnalysis.contentLength < 500) {
                improvements.push('Expand content to at least 500 words');
            }
            if (seoAnalysis.readabilityScore < 60) {
                improvements.push('Improve readability (use shorter sentences)');
            }
            if (seoAnalysis.keywordDensity < 0.5) {
                improvements.push('Increase keyword density naturally');
            }
            if (seoAnalysis.keywordDensity > 3) {
                improvements.push('Reduce keyword density (avoid keyword stuffing)');
            }
            // Calculate suggested score after improvements
            const suggestedAnalysis = { ...seoAnalysis };
            if (improvements.length > 0) {
                suggestedAnalysis.hasMetaDescription = true;
                suggestedAnalysis.hasTargetKeywords = true;
                suggestedAnalysis.hasInternalLinks = true;
                suggestedAnalysis.contentLength = Math.max(seoAnalysis.contentLength, 500);
                suggestedAnalysis.readabilityScore = Math.max(seoAnalysis.readabilityScore, 60);
                suggestedAnalysis.keywordDensity = Math.min(Math.max(seoAnalysis.keywordDensity, 0.5), 3);
            }
            const suggestedScore = calculateSEOScore(suggestedAnalysis);
            // Determine priority
            let priority = 'low';
            if (currentScore < 50 || improvements.length > 3) {
                priority = 'high';
            }
            else if (currentScore < 70 || improvements.length > 1) {
                priority = 'medium';
            }
            optimizations.push({
                articleId: article.id,
                question: article.question,
                slug: article.slug || '',
                platform: article.platform,
                currentScore,
                suggestedScore,
                improvements,
                priority
            });
        });
        // Sort by priority and potential improvement
        optimizations.sort((a, b) => {
            if (a.priority === 'high' && b.priority !== 'high')
                return -1;
            if (b.priority === 'high' && a.priority !== 'high')
                return 1;
            return (b.suggestedScore - b.currentScore) - (a.suggestedScore - a.currentScore);
        });
        // Display optimization report
        console.log('📊 CONTENT OPTIMIZATION REPORT');
        console.log('==============================\n');
        const highPriority = optimizations.filter(o => o.priority === 'high');
        const mediumPriority = optimizations.filter(o => o.priority === 'medium');
        const lowPriority = optimizations.filter(o => o.priority === 'low');
        console.log(`🔴 High Priority: ${highPriority.length} articles`);
        console.log(`🟡 Medium Priority: ${mediumPriority.length} articles`);
        console.log(`🟢 Low Priority: ${lowPriority.length} articles`);
        console.log(`📈 Average Current Score: ${(optimizations.reduce((sum, o) => sum + o.currentScore, 0) / optimizations.length).toFixed(1)}`);
        console.log(`🎯 Average Potential Score: ${(optimizations.reduce((sum, o) => sum + o.suggestedScore, 0) / optimizations.length).toFixed(1)}`);
        console.log('\n🔴 HIGH PRIORITY OPTIMIZATIONS:');
        console.log('================================\n');
        highPriority.slice(0, 10).forEach((optimization, index) => {
            console.log(`${index + 1}. [${optimization.platform}] ${optimization.question.substring(0, 60)}...`);
            console.log(`   Current Score: ${optimization.currentScore}/100`);
            console.log(`   Potential Score: ${optimization.suggestedScore}/100`);
            console.log(`   Improvements:`);
            optimization.improvements.forEach(improvement => {
                console.log(`     • ${improvement}`);
            });
            console.log('');
        });
        // Platform-specific analysis
        console.log('🏢 PLATFORM-SPECIFIC OPTIMIZATION NEEDS:');
        console.log('========================================\n');
        const platformAnalysis = new Map();
        optimizations.forEach(opt => {
            if (!platformAnalysis.has(opt.platform)) {
                platformAnalysis.set(opt.platform, { count: 0, avgScore: 0, improvements: [] });
            }
            const analysis = platformAnalysis.get(opt.platform);
            analysis.count++;
            analysis.avgScore += opt.currentScore;
            analysis.improvements.push(...opt.improvements);
        });
        Array.from(platformAnalysis.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .forEach(([platform, analysis]) => {
            const avgScore = analysis.avgScore / analysis.count;
            const uniqueImprovements = [...new Set(analysis.improvements)];
            console.log(`${platform.toUpperCase()} (${analysis.count} articles):`);
            console.log(`  • Average SEO Score: ${avgScore.toFixed(1)}/100`);
            console.log(`  • Top Improvement Needs:`);
            uniqueImprovements.slice(0, 3).forEach(improvement => {
                console.log(`    - ${improvement}`);
            });
            console.log('');
        });
        // Generate optimization recommendations
        console.log('💡 OPTIMIZATION RECOMMENDATIONS:');
        console.log('================================\n');
        const allImprovements = optimizations.flatMap(o => o.improvements);
        const improvementCounts = new Map();
        allImprovements.forEach(improvement => {
            improvementCounts.set(improvement, (improvementCounts.get(improvement) || 0) + 1);
        });
        const topImprovements = Array.from(improvementCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        console.log('Most Common Improvement Needs:');
        topImprovements.forEach(([improvement, count]) => {
            console.log(`  • ${improvement} (${count} articles need this)`);
        });
        console.log('\n📈 POTENTIAL IMPACT:');
        console.log('===================\n');
        const totalPotentialImprovement = optimizations.reduce((sum, o) => sum + (o.suggestedScore - o.currentScore), 0);
        const highImpactArticles = optimizations.filter(o => o.suggestedScore - o.currentScore > 20).length;
        console.log(`Total Potential Score Improvement: ${totalPotentialImprovement.toFixed(1)} points`);
        console.log(`Articles with High Impact (>20 point improvement): ${highImpactArticles}`);
        console.log(`Average Improvement per Article: ${(totalPotentialImprovement / optimizations.length).toFixed(1)} points`);
        // Save detailed optimization report
        const optimizationReport = {
            summary: {
                totalArticles: optimizations.length,
                highPriority: highPriority.length,
                mediumPriority: mediumPriority.length,
                lowPriority: lowPriority.length,
                averageCurrentScore: optimizations.reduce((sum, o) => sum + o.currentScore, 0) / optimizations.length,
                averagePotentialScore: optimizations.reduce((sum, o) => sum + o.suggestedScore, 0) / optimizations.length,
                totalPotentialImprovement
            },
            optimizations,
            platformAnalysis: Object.fromEntries(platformAnalysis),
            topImprovements,
            timestamp: new Date().toISOString()
        };
        (0, fs_1.writeFileSync)((0, path_1.join)(process.cwd(), 'content-optimization-report.json'), JSON.stringify(optimizationReport, null, 2));
        console.log('✅ Detailed optimization report saved to: content-optimization-report.json');
    }
    catch (error) {
        console.error('❌ Error in content optimization:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
function calculateReadabilityScore(text) {
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const syllables = countSyllables(text);
    if (sentences === 0 || words === 0)
        return 0;
    // Flesch Reading Ease formula
    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.max(0, Math.min(100, score));
}
function countSyllables(text) {
    const words = text.toLowerCase().split(/\s+/);
    let syllableCount = 0;
    words.forEach(word => {
        const cleanWord = word.replace(/[^a-z]/g, '');
        if (cleanWord.length <= 3) {
            syllableCount += 1;
        }
        else {
            syllableCount += (cleanWord.match(/[aeiouy]+/g) || []).length;
        }
    });
    return syllableCount;
}
function calculateKeywordDensity(content, keywords) {
    const words = content.split(/\s+/).length;
    let keywordCount = 0;
    keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = content.match(regex);
        if (matches) {
            keywordCount += matches.length;
        }
    });
    return words > 0 ? (keywordCount / words) * 100 : 0;
}
function calculateSEOScore(analysis) {
    let score = 0;
    // Meta description (20 points)
    if (analysis.hasMetaDescription)
        score += 20;
    // Target keywords (25 points)
    if (analysis.hasTargetKeywords)
        score += 25;
    // Internal links (15 points)
    if (analysis.hasInternalLinks)
        score += 15;
    // Schema markup (10 points)
    if (analysis.hasSchemaMarkup)
        score += 10;
    // Content length (15 points)
    if (analysis.contentLength >= 1000)
        score += 15;
    else if (analysis.contentLength >= 500)
        score += 10;
    else if (analysis.contentLength >= 200)
        score += 5;
    // Readability (10 points)
    if (analysis.readabilityScore >= 80)
        score += 10;
    else if (analysis.readabilityScore >= 60)
        score += 7;
    else if (analysis.readabilityScore >= 40)
        score += 4;
    // Keyword density (5 points)
    if (analysis.keywordDensity >= 0.5 && analysis.keywordDensity <= 3)
        score += 5;
    return Math.min(100, score);
}
// Run the content optimization
if (require.main === module) {
    automatedContentOptimization()
        .then(() => {
        console.log('\n🎉 Content optimization analysis completed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=automated-content-optimization.js.map