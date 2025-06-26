interface NewsArticle {
    url: string;
    title: string;
    content: string;
    platform: string;
    category: string;
    publishDate?: string;
    author?: string;
    summary?: string;
    tags?: string[];
    contentType: 'news' | 'policy' | 'announcement';
    priority: 'high' | 'medium' | 'low';
}
export declare function crawlNewsAndPolicies(): Promise<NewsArticle[]>;
export declare function getHighPriorityArticles(): Promise<NewsArticle[]>;
export {};
//# sourceMappingURL=news-policy.d.ts.map