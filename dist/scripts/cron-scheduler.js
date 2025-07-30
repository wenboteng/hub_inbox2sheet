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
exports.ContentCronScheduler = void 0;
const cron_1 = require("cron");
const client_1 = require("@prisma/client");
const enhanced_tour_vendor_collector_1 = require("./enhanced-tour-vendor-collector");
const community_content_prioritizer_1 = require("./community-content-prioritizer");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const prisma = new client_1.PrismaClient();
class ContentCronScheduler {
    constructor() {
        this.jobs = new Map();
        this.collector = new enhanced_tour_vendor_collector_1.EnhancedTourVendorCollector();
        this.prioritizer = new community_content_prioritizer_1.CommunityContentPrioritizer();
    }
    /**
     * Initialize all cron jobs
     */
    initializeJobs() {
        const jobConfigs = [
            {
                name: 'daily-content-collection',
                schedule: '0 2 * * *', // Daily at 2:00 AM
                description: 'Collect new tour vendor content daily',
                enabled: true
            },
            {
                name: 'weekly-content-prioritization',
                schedule: '0 3 * * 0', // Weekly on Sunday at 3:00 AM
                description: 'Prioritize and clean up content weekly',
                enabled: true
            },
            {
                name: 'hourly-content-quality-check',
                schedule: '0 * * * *', // Every hour
                description: 'Check content quality and flag issues',
                enabled: true
            },
            {
                name: 'daily-community-content-focus',
                schedule: '0 4 * * *', // Daily at 4:00 AM
                description: 'Focus on community content collection',
                enabled: true
            }
        ];
        jobConfigs.forEach(config => {
            if (config.enabled) {
                this.createJob(config);
            }
        });
        console.log(`✅ Initialized ${this.jobs.size} cron jobs`);
    }
    /**
     * Create a cron job
     */
    createJob(config) {
        const job = new cron_1.CronJob(config.schedule, async () => {
            console.log(`🕐 Running scheduled job: ${config.name}`);
            console.log(`📝 Description: ${config.description}`);
            try {
                await this.executeJob(config.name);
                console.log(`✅ Job ${config.name} completed successfully`);
            }
            catch (error) {
                console.error(`❌ Job ${config.name} failed:`, error);
            }
        }, null, false, // Don't start immediately
        'UTC');
        this.jobs.set(config.name, job);
        console.log(`📅 Created job: ${config.name} (${config.schedule})`);
    }
    /**
     * Execute a specific job
     */
    async executeJob(jobName) {
        switch (jobName) {
            case 'daily-content-collection':
                await this.runDailyContentCollection();
                break;
            case 'weekly-content-prioritization':
                await this.runWeeklyContentPrioritization();
                break;
            case 'hourly-content-quality-check':
                await this.runHourlyContentQualityCheck();
                break;
            case 'daily-community-content-focus':
                await this.runDailyCommunityContentFocus();
                break;
            default:
                console.warn(`⚠️ Unknown job: ${jobName}`);
        }
    }
    /**
     * Daily content collection job
     */
    async runDailyContentCollection() {
        console.log('🔍 Starting daily content collection...');
        try {
            await prisma.$connect();
            // Run enhanced content collection
            const stats = await this.collector.collectEnhancedTourVendorContent();
            // Log results
            console.log(`📊 Daily collection results:`);
            console.log(`  - New articles: ${stats.newArticles}`);
            console.log(`  - Community articles: ${stats.communityArticles}`);
            console.log(`  - OTA articles: ${stats.otaArticles}`);
            console.log(`  - High quality: ${stats.qualityScores.high}`);
            // Store job execution record
            await this.logJobExecution('daily-content-collection', {
                newArticles: stats.newArticles,
                communityArticles: stats.communityArticles,
                otaArticles: stats.otaArticles,
                highQuality: stats.qualityScores.high
            });
        }
        catch (error) {
            console.error('❌ Daily content collection failed:', error);
            throw error;
        }
        finally {
            await prisma.$disconnect();
        }
    }
    /**
     * Weekly content prioritization job
     */
    async runWeeklyContentPrioritization() {
        console.log('🔄 Starting weekly content prioritization...');
        try {
            await prisma.$connect();
            // Prioritize all content
            const scores = await this.prioritizer.prioritizeAllContent();
            // Apply recommendations
            await this.prioritizer.applyPrioritization(scores);
            // Calculate statistics
            const prioritized = scores.filter(s => s.recommendedAction === 'prioritize').length;
            const kept = scores.filter(s => s.recommendedAction === 'keep').length;
            const deprioritized = scores.filter(s => s.recommendedAction === 'deprioritize').length;
            const removed = scores.filter(s => s.recommendedAction === 'remove').length;
            console.log(`📊 Weekly prioritization results:`);
            console.log(`  - Prioritized: ${prioritized}`);
            console.log(`  - Kept: ${kept}`);
            console.log(`  - Deprioritized: ${deprioritized}`);
            console.log(`  - Removed: ${removed}`);
            // Store job execution record
            await this.logJobExecution('weekly-content-prioritization', {
                prioritized,
                kept,
                deprioritized,
                removed,
                totalAnalyzed: scores.length
            });
        }
        catch (error) {
            console.error('❌ Weekly content prioritization failed:', error);
            throw error;
        }
        finally {
            await prisma.$disconnect();
        }
    }
    /**
     * Hourly content quality check job
     */
    async runHourlyContentQualityCheck() {
        console.log('🔍 Starting hourly content quality check...');
        try {
            await prisma.$connect();
            // Get recent articles (last 24 hours)
            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
            const recentArticles = await prisma.article.findMany({
                where: {
                    createdAt: {
                        gte: twentyFourHoursAgo
                    },
                    crawlStatus: 'active'
                }
            });
            // Analyze quality
            const qualityStats = {
                total: recentArticles.length,
                highQuality: 0,
                mediumQuality: 0,
                lowQuality: 0,
                communityContent: 0,
                promotionalContent: 0
            };
            recentArticles.forEach(article => {
                const text = `${article.question} ${article.answer}`.toLowerCase();
                // Simple quality assessment
                if (article.votes >= 10 || article.isVerified) {
                    qualityStats.highQuality++;
                }
                else if (article.votes >= 5) {
                    qualityStats.mediumQuality++;
                }
                else {
                    qualityStats.lowQuality++;
                }
                if (article.contentType === 'community') {
                    qualityStats.communityContent++;
                }
                if (text.includes('promote') || text.includes('advertise') || text.includes('sponsored')) {
                    qualityStats.promotionalContent++;
                }
            });
            console.log(`📊 Hourly quality check results:`);
            console.log(`  - Recent articles: ${qualityStats.total}`);
            console.log(`  - High quality: ${qualityStats.highQuality}`);
            console.log(`  - Community content: ${qualityStats.communityContent}`);
            console.log(`  - Promotional content: ${qualityStats.promotionalContent}`);
            // Store job execution record
            await this.logJobExecution('hourly-content-quality-check', qualityStats);
        }
        catch (error) {
            console.error('❌ Hourly content quality check failed:', error);
            throw error;
        }
        finally {
            await prisma.$disconnect();
        }
    }
    /**
     * Daily community content focus job
     */
    async runDailyCommunityContentFocus() {
        console.log('🏢 Starting daily community content focus...');
        try {
            await prisma.$connect();
            // Focus on community platforms
            const communityQueries = [
                'tour operator reddit questions',
                'tour guide quora problems',
                'tour business owner forum',
                'tour operator community help',
                'tour guide facebook group issues',
                'tour business owner stack overflow'
            ];
            let totalCollected = 0;
            for (const query of communityQueries) {
                try {
                    console.log(`🔍 Searching community: "${query}"`);
                    // This would integrate with the oxylabs scraper
                    // For now, we'll simulate the process
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    totalCollected += Math.floor(Math.random() * 3) + 1; // Simulate results
                }
                catch (error) {
                    console.error(`❌ Community search failed for "${query}":`, error);
                }
            }
            console.log(`📊 Daily community focus results:`);
            console.log(`  - Community articles collected: ${totalCollected}`);
            // Store job execution record
            await this.logJobExecution('daily-community-content-focus', {
                communityArticlesCollected: totalCollected,
                queriesProcessed: communityQueries.length
            });
        }
        catch (error) {
            console.error('❌ Daily community content focus failed:', error);
            throw error;
        }
        finally {
            await prisma.$disconnect();
        }
    }
    /**
     * Log job execution to database
     */
    async logJobExecution(jobName, results) {
        try {
            await prisma.crawlJob.create({
                data: {
                    source: jobName,
                    status: 'completed',
                    startedAt: new Date(),
                    endedAt: new Date(),
                    error: null
                }
            });
        }
        catch (error) {
            console.error('Failed to log job execution:', error);
        }
    }
    /**
     * Start all jobs
     */
    startAllJobs() {
        console.log('🚀 Starting all cron jobs...');
        this.jobs.forEach((job, name) => {
            job.start();
            console.log(`✅ Started job: ${name}`);
        });
    }
    /**
     * Stop all jobs
     */
    stopAllJobs() {
        console.log('🛑 Stopping all cron jobs...');
        this.jobs.forEach((job, name) => {
            job.stop();
            console.log(`⏹️ Stopped job: ${name}`);
        });
    }
    /**
     * Get job status
     */
    getJobStatus() {
        return Array.from(this.jobs.entries()).map(([name, job]) => {
            const nextDate = job.nextDate();
            return {
                name,
                running: false, // We'll track this manually
                nextRun: nextDate ? nextDate.toJSDate() : null
            };
        });
    }
}
exports.ContentCronScheduler = ContentCronScheduler;
// Main execution
async function main() {
    const scheduler = new ContentCronScheduler();
    try {
        console.log('🕐 Initializing content cron scheduler...');
        // Initialize jobs
        scheduler.initializeJobs();
        // Start all jobs
        scheduler.startAllJobs();
        // Keep the process running
        console.log('🔄 Cron scheduler is running. Press Ctrl+C to stop.');
        // Log job status every hour
        setInterval(() => {
            const status = scheduler.getJobStatus();
            console.log('\n📊 Current job status:');
            status.forEach(job => {
                console.log(`  ${job.name}: ${job.running ? '🟢 Running' : '🔴 Stopped'} (Next: ${job.nextRun?.toISOString()})`);
            });
        }, 3600000); // Every hour
        // Keep process alive
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down cron scheduler...');
            scheduler.stopAllJobs();
            process.exit(0);
        });
    }
    catch (error) {
        console.error('❌ Cron scheduler failed:', error);
        process.exit(1);
    }
}
// Run if called directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=cron-scheduler.js.map