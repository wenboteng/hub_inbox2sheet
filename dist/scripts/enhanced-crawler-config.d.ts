export declare const ENHANCED_CRAWLER_CONFIG: {
    globalRateLimit: {
        conservative: {
            minDelay: number;
            maxDelay: number;
        };
        moderate: {
            minDelay: number;
            maxDelay: number;
        };
        aggressive: {
            minDelay: number;
            maxDelay: number;
        };
    };
    platforms: {
        tripadvisor: {
            name: string;
            baseUrl: string;
            rateLimit: {
                minDelay: number;
                maxDelay: number;
            };
            maxThreadsPerCategory: number;
            maxRepliesPerThread: number;
            maxPagesPerCategory: number;
            categories: string[];
            safetyLevel: string;
            retryAttempts: number;
            exponentialBackoff: boolean;
        };
        airbnb: {
            name: string;
            baseUrl: string;
            rateLimit: {
                minDelay: number;
                maxDelay: number;
            };
            maxThreadsPerCategory: number;
            maxRepliesPerThread: number;
            maxPagesPerCategory: number;
            categories: string[];
            safetyLevel: string;
            retryAttempts: number;
            exponentialBackoff: boolean;
        };
        stackoverflow: {
            name: string;
            baseUrl: string;
            rateLimit: {
                minDelay: number;
                maxDelay: number;
            };
            maxQuestionsPerTag: number;
            maxAnswersPerQuestion: number;
            tags: string[];
            safetyLevel: string;
            retryAttempts: number;
            exponentialBackoff: boolean;
        };
        reddit: {
            name: string;
            baseUrl: string;
            rateLimit: {
                minDelay: number;
                maxDelay: number;
            };
            maxPostsPerSubreddit: number;
            maxCommentsPerPost: number;
            subreddits: string[];
            safetyLevel: string;
            retryAttempts: number;
            exponentialBackoff: boolean;
        };
        getyourguide: {
            name: string;
            baseUrl: string;
            rateLimit: {
                minDelay: number;
                maxDelay: number;
            };
            maxArticlesPerCategory: number;
            maxPagesPerCategory: number;
            categories: string[];
            safetyLevel: string;
            retryAttempts: number;
            exponentialBackoff: boolean;
        };
        viator: {
            name: string;
            baseUrl: string;
            rateLimit: {
                minDelay: number;
                maxDelay: number;
            };
            maxArticlesPerCategory: number;
            maxPagesPerCategory: number;
            categories: string[];
            safetyLevel: string;
            retryAttempts: number;
            exponentialBackoff: boolean;
        };
    };
    newSources: {
        quora: {
            name: string;
            baseUrl: string;
            rateLimit: {
                minDelay: number;
                maxDelay: number;
            };
            maxQuestionsPerTopic: number;
            topics: string[];
            safetyLevel: string;
            retryAttempts: number;
            exponentialBackoff: boolean;
        };
        booking: {
            name: string;
            baseUrl: string;
            rateLimit: {
                minDelay: number;
                maxDelay: number;
            };
            maxThreadsPerForum: number;
            maxRepliesPerThread: number;
            forums: string[];
            safetyLevel: string;
            retryAttempts: number;
            exponentialBackoff: boolean;
        };
        expedia: {
            name: string;
            baseUrl: string;
            rateLimit: {
                minDelay: number;
                maxDelay: number;
            };
            maxThreadsPerForum: number;
            maxRepliesPerThread: number;
            forums: string[];
            safetyLevel: string;
            retryAttempts: number;
            exponentialBackoff: boolean;
        };
    };
    archiveOrg: {
        name: string;
        baseUrl: string;
        rateLimit: {
            minDelay: number;
            maxDelay: number;
        };
        maxSnapshotsPerUrl: number;
        maxUrlsPerRun: number;
        safetyLevel: string;
        retryAttempts: number;
        exponentialBackoff: boolean;
    };
    monitoring: {
        maxRequestsPerHour: number;
        maxRequestsPerDay: number;
        maxConcurrentRequests: number;
        requestTimeout: number;
        healthCheckInterval: number;
        failureThreshold: number;
        successRateThreshold: number;
    };
    qualityFilters: {
        minContentLength: number;
        maxContentLength: number;
        minWordCount: number;
        maxWordCount: number;
        excludeKeywords: string[];
        requiredKeywords: string[];
    };
    userAgents: string[];
};
export declare class SafeCrawler {
    private config;
    private requestCount;
    private failureCount;
    private successCount;
    private lastRequestTime;
    constructor(config: any);
    delay(): Promise<void>;
    exponentialBackoff(attempt: number): Promise<void>;
    shouldContinue(): boolean;
    recordSuccess(): void;
    recordFailure(): void;
    getStats(): {
        totalRequests: number;
        successCount: number;
        failureCount: number;
        successRate: number;
    };
}
export declare function validateContent(content: string, platform: string): boolean;
export declare function getHistoricalContentUrls(platform: string, baseUrl: string): Promise<string[]>;
//# sourceMappingURL=enhanced-crawler-config.d.ts.map