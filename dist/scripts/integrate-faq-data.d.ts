interface FAQQuestion {
    id: string;
    question: string;
    answer: string;
    categoryId: string;
    platform: string;
    tags: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: number;
    contentQuality: number;
    isVerified: boolean;
    lastUpdated: string;
    source: 'existing' | 'oxylabs' | 'community';
}
declare const FAQ_CATEGORIES: {
    'Pricing & Revenue': {
        id: string;
        name: string;
        description: string;
        icon: string;
        color: string;
        priority: number;
        keywords: string[];
    };
    'Marketing & SEO': {
        id: string;
        name: string;
        description: string;
        icon: string;
        color: string;
        priority: number;
        keywords: string[];
    };
    'Customer Service': {
        id: string;
        name: string;
        description: string;
        icon: string;
        color: string;
        priority: number;
        keywords: string[];
    };
    'Technical Setup': {
        id: string;
        name: string;
        description: string;
        icon: string;
        color: string;
        priority: number;
        keywords: string[];
    };
    'Booking & Cancellations': {
        id: string;
        name: string;
        description: string;
        icon: string;
        color: string;
        priority: number;
        keywords: string[];
    };
    'Policies & Legal': {
        id: string;
        name: string;
        description: string;
        icon: string;
        color: string;
        priority: number;
        keywords: string[];
    };
    General: {
        id: string;
        name: string;
        description: string;
        icon: string;
        color: string;
        priority: number;
        keywords: never[];
    };
};
declare function transformArticleToFAQ(article: any): Promise<FAQQuestion>;
declare function integrateExistingData(): Promise<void>;
export { integrateExistingData, FAQ_CATEGORIES, transformArticleToFAQ };
//# sourceMappingURL=integrate-faq-data.d.ts.map