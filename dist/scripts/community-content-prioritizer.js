#!/usr/bin/env tsx
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityContentPrioritizer = void 0;
const client_1 = require("@prisma/client");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const prisma = new client_1.PrismaClient();
class CommunityContentPrioritizer {
    /**
     * Calculate priority score for content
     */
    calculatePriorityScore(article) {
        const text = `${article.question} ${article.answer}`.toLowerCase();
        // Priority factors
        const factors = {
            isCommunity: this.isCommunityContent(article),
            isQuestionBased: this.isQuestionBased(article),
            hasProblemSolution: this.hasProblemSolution(text),
            isTourVendorSpecific: this.isTourVendorSpecific(text),
            isRecent: this.isRecent(article),
            hasEngagement: this.hasEngagement(article),
            isNotPromotional: this.isNotPromotional(text)
        };
        // Calculate score (0-100)
        let score = 0;
        if (factors.isCommunity)
            score += 25;
        if (factors.isQuestionBased)
            score += 20;
        if (factors.hasProblemSolution)
            score += 15;
        if (factors.isTourVendorSpecific)
            score += 20;
        if (factors.isRecent)
            score += 10;
        if (factors.hasEngagement)
            score += 5;
        if (factors.isNotPromotional)
            score += 5;
        // Determine recommended action
        let recommendedAction;
        if (score >= 80)
            recommendedAction = 'prioritize';
        else if (score >= 60)
            recommendedAction = 'keep';
        else if (score >= 40)
            recommendedAction = 'deprioritize';
        else
            recommendedAction = 'remove';
        return {
            articleId: article.id,
            title: article.question,
            platform: article.platform,
            contentType: article.contentType,
            source: article.source,
            priorityScore: score,
            priorityFactors: factors,
            recommendedAction
        };
    }
    /**
     * Check if content is from community sources
     */
    isCommunityContent(article) {
        const communitySources = [
            'reddit', 'quora', 'stackoverflow', 'facebook', 'linkedin',
            'tripadvisor', 'airbnb_community', 'community'
        ];
        return communitySources.includes(article.source.toLowerCase()) ||
            communitySources.includes(article.platform.toLowerCase()) ||
            article.contentType === 'community';
    }
    /**
     * Check if content is question-based
     */
    isQuestionBased(article) {
        const question = article.question.toLowerCase();
        const questionIndicators = [
            'how', 'what', 'why', 'when', 'where', 'which', 'who',
            'problem', 'issue', 'help', 'support', 'trouble', 'error',
            'question', 'ask', 'advice', 'recommendation'
        ];
        return questionIndicators.some(indicator => question.includes(indicator));
    }
    /**
     * Check if content has problem-solution structure
     */
    hasProblemSolution(text) {
        const problemIndicators = [
            'problem', 'issue', 'error', 'trouble', 'difficulty', 'challenge',
            'not working', 'doesn\'t work', 'failed', 'broken', 'stuck'
        ];
        const solutionIndicators = [
            'solution', 'fix', 'resolve', 'solve', 'answer', 'help',
            'try this', 'do this', 'follow these steps', 'here\'s how'
        ];
        const hasProblem = problemIndicators.some(indicator => text.includes(indicator));
        const hasSolution = solutionIndicators.some(indicator => text.includes(indicator));
        return hasProblem && hasSolution;
    }
    /**
     * Check if content is tour vendor specific
     */
    isTourVendorSpecific(text) {
        const tourVendorKeywords = [
            'tour operator', 'tour guide', 'tour business', 'tour company',
            'tour package', 'tour service', 'tour experience', 'guided tour',
            'city tour', 'day tour', 'multi-day tour', 'tour vehicle',
            'tour equipment', 'tour staff', 'tour itinerary', 'tour route',
            'tour destination', 'tour group', 'tour capacity', 'tour availability'
        ];
        return tourVendorKeywords.some(keyword => text.includes(keyword));
    }
    /**
     * Check if content is recent
     */
    isRecent(article) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return article.lastUpdated > thirtyDaysAgo;
    }
    /**
     * Check if content has engagement
     */
    hasEngagement(article) {
        return (article.votes || 0) > 5 || article.isVerified;
    }
    /**
     * Check if content is not promotional
     */
    isNotPromotional(text) {
        const promotionalKeywords = [
            'promote', 'advertise', 'sponsored', 'affiliate', 'commission',
            'blog post', 'article', 'guide', 'tutorial', 'how-to',
            'best practices', 'tips and tricks', 'ultimate guide',
            'exclusive', 'special offer', 'limited time', 'discount'
        ];
        return !promotionalKeywords.some(keyword => text.includes(keyword));
    }
    /**
     * Prioritize all content in database
     */
    async prioritizeAllContent() {
        console.log('🔍 Starting content prioritization...');
        const articles = await prisma.article.findMany({
            where: {
                crawlStatus: 'active',
                isDuplicate: false
            }
        });
        console.log(`📊 Analyzing ${articles.length} articles...`);
        const priorityScores = [];
        for (const article of articles) {
            const score = this.calculatePriorityScore(article);
            priorityScores.push(score);
        }
        // Sort by priority score (highest first)
        priorityScores.sort((a, b) => b.priorityScore - a.priorityScore);
        return priorityScores;
    }
    /**
     * Apply prioritization recommendations
     */
    async applyPrioritization(scores) {
        console.log('🔄 Applying prioritization recommendations...');
        let kept = 0;
        let prioritized = 0;
        let deprioritized = 0;
        let removed = 0;
        for (const score of scores) {
            switch (score.recommendedAction) {
                case 'prioritize':
                    await prisma.article.update({
                        where: { id: score.articleId },
                        data: {
                            votes: { increment: 10 },
                            isVerified: true,
                            crawlStatus: 'active'
                        }
                    });
                    prioritized++;
                    break;
                case 'keep':
                    await prisma.article.update({
                        where: { id: score.articleId },
                        data: { crawlStatus: 'active' }
                    });
                    kept++;
                    break;
                case 'deprioritize':
                    await prisma.article.update({
                        where: { id: score.articleId },
                        data: {
                            votes: { decrement: 5 },
                            crawlStatus: 'active'
                        }
                    });
                    deprioritized++;
                    break;
                case 'remove':
                    await prisma.article.update({
                        where: { id: score.articleId },
                        data: { crawlStatus: 'inactive' }
                    });
                    removed++;
                    break;
            }
        }
        console.log(`✅ Prioritization complete:`);
        console.log(`  Prioritized: ${prioritized}`);
        console.log(`  Kept: ${kept}`);
        console.log(`  Deprioritized: ${deprioritized}`);
        console.log(`  Removed: ${removed}`);
    }
    /**
     * Generate prioritization report
     */
    generateReport(scores) {
        console.log('\n📊 CONTENT PRIORITIZATION REPORT');
        console.log('================================');
        const total = scores.length;
        const prioritized = scores.filter(s => s.recommendedAction === 'prioritize').length;
        const kept = scores.filter(s => s.recommendedAction === 'keep').length;
        const deprioritized = scores.filter(s => s.recommendedAction === 'deprioritize').length;
        const removed = scores.filter(s => s.recommendedAction === 'remove').length;
        console.log(`Total articles analyzed: ${total}`);
        console.log(`Prioritized: ${prioritized} (${(prioritized / total * 100).toFixed(1)}%)`);
        console.log(`Kept: ${kept} (${(kept / total * 100).toFixed(1)}%)`);
        console.log(`Deprioritized: ${deprioritized} (${(deprioritized / total * 100).toFixed(1)}%)`);
        console.log(`Removed: ${removed} (${(removed / total * 100).toFixed(1)}%)`);
        console.log('\n🏆 TOP 10 HIGHEST PRIORITY ARTICLES:');
        scores.slice(0, 10).forEach((score, index) => {
            console.log(`${index + 1}. [${score.priorityScore}] ${score.title.substring(0, 60)}...`);
            console.log(`   Platform: ${score.platform}, Source: ${score.source}`);
        });
        console.log('\n⚠️  ARTICLES RECOMMENDED FOR REMOVAL:');
        scores.filter(s => s.recommendedAction === 'remove').slice(0, 5).forEach((score, index) => {
            console.log(`${index + 1}. [${score.priorityScore}] ${score.title.substring(0, 60)}...`);
            console.log(`   Platform: ${score.platform}, Source: ${score.source}`);
        });
    }
}
exports.CommunityContentPrioritizer = CommunityContentPrioritizer;
// Main execution
async function main() {
    const prioritizer = new CommunityContentPrioritizer();
    try {
        await prisma.$connect();
        console.log('✅ Database connected');
        // Prioritize all content
        const scores = await prioritizer.prioritizeAllContent();
        // Generate report
        prioritizer.generateReport(scores);
        // Apply recommendations
        await prioritizer.applyPrioritization(scores);
    }
    catch (error) {
        console.error('❌ Prioritization failed:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run if called directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=community-content-prioritizer.js.map