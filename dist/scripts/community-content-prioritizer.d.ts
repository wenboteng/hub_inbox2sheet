#!/usr/bin/env tsx
interface ContentPriorityScore {
    articleId: string;
    title: string;
    platform: string;
    contentType: string;
    source: string;
    priorityScore: number;
    priorityFactors: {
        isCommunity: boolean;
        isQuestionBased: boolean;
        hasProblemSolution: boolean;
        isTourVendorSpecific: boolean;
        isRecent: boolean;
        hasEngagement: boolean;
        isNotPromotional: boolean;
    };
    recommendedAction: 'keep' | 'prioritize' | 'deprioritize' | 'remove';
}
declare class CommunityContentPrioritizer {
    /**
     * Calculate priority score for content
     */
    private calculatePriorityScore;
    /**
     * Check if content is from community sources
     */
    private isCommunityContent;
    /**
     * Check if content is question-based
     */
    private isQuestionBased;
    /**
     * Check if content has problem-solution structure
     */
    private hasProblemSolution;
    /**
     * Check if content is tour vendor specific
     */
    private isTourVendorSpecific;
    /**
     * Check if content is recent
     */
    private isRecent;
    /**
     * Check if content has engagement
     */
    private hasEngagement;
    /**
     * Check if content is not promotional
     */
    private isNotPromotional;
    /**
     * Prioritize all content in database
     */
    prioritizeAllContent(): Promise<ContentPriorityScore[]>;
    /**
     * Apply prioritization recommendations
     */
    applyPrioritization(scores: ContentPriorityScore[]): Promise<void>;
    /**
     * Generate prioritization report
     */
    generateReport(scores: ContentPriorityScore[]): void;
}
export { CommunityContentPrioritizer };
//# sourceMappingURL=community-content-prioritizer.d.ts.map