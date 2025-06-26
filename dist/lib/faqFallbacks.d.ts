export interface FAQFallback {
    id: string;
    platform: string;
    category: string;
    triggerKeywords: string[];
    question: string;
    answer: string;
    confidence: 'high' | 'medium' | 'low';
    source?: string;
    lastUpdated: string;
}
export declare const FAQ_FALLBACKS: FAQFallback[];
export declare function findMatchingFallback(query: string, platform?: string): FAQFallback | null;
export declare function getFallbackForPlatform(platform: string, category?: string): FAQFallback[];
//# sourceMappingURL=faqFallbacks.d.ts.map