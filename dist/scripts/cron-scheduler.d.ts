#!/usr/bin/env tsx
declare class ContentCronScheduler {
    private jobs;
    private collector;
    private prioritizer;
    constructor();
    /**
     * Initialize all cron jobs
     */
    initializeJobs(): void;
    /**
     * Create a cron job
     */
    private createJob;
    /**
     * Execute a specific job
     */
    private executeJob;
    /**
     * Daily content collection job
     */
    private runDailyContentCollection;
    /**
     * Weekly content prioritization job
     */
    private runWeeklyContentPrioritization;
    /**
     * Hourly content quality check job
     */
    private runHourlyContentQualityCheck;
    /**
     * Daily community content focus job
     */
    private runDailyCommunityContentFocus;
    /**
     * Log job execution to database
     */
    private logJobExecution;
    /**
     * Start all jobs
     */
    startAllJobs(): void;
    /**
     * Stop all jobs
     */
    stopAllJobs(): void;
    /**
     * Get job status
     */
    getJobStatus(): {
        name: string;
        running: boolean;
        nextRun: Date | null;
    }[];
}
export { ContentCronScheduler };
//# sourceMappingURL=cron-scheduler.d.ts.map