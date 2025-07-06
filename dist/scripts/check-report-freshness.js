"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkReportFreshness = checkReportFreshness;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const FRESHNESS_CONFIGS = [
    {
        reportType: 'vendor-analytics',
        maxAgeDays: 7,
        isCritical: true,
        description: 'Vendor Analytics Report'
    },
    {
        reportType: 'customer-insights',
        maxAgeDays: 7,
        isCritical: true,
        description: 'Customer Insights Report'
    },
    {
        reportType: 'competitive-analysis',
        maxAgeDays: 7,
        isCritical: true,
        description: 'Competitive Analysis Report'
    },
    {
        reportType: 'executive-summary',
        maxAgeDays: 30,
        isCritical: false,
        description: 'Executive Summary'
    },
    {
        reportType: 'tour-vendor-business-intelligence',
        maxAgeDays: 30,
        isCritical: false,
        description: 'Tour Vendor Business Intelligence Report'
    },
    {
        reportType: 'cancellation-reasons',
        maxAgeDays: 30,
        isCritical: false,
        description: 'Cancellation Reasons Report'
    }
];
async function checkReportFreshness() {
    console.log('🔍 REPORT FRESHNESS CHECKER');
    console.log('===========================');
    console.log(`⏰ Checked at: ${new Date().toISOString()}`);
    console.log('');
    const now = new Date();
    let totalReports = 0;
    let freshReports = 0;
    let staleReports = 0;
    let criticalStaleReports = 0;
    try {
        for (const config of FRESHNESS_CONFIGS) {
            totalReports++;
            const report = await prisma.report.findUnique({
                where: { type: config.reportType }
            });
            if (!report) {
                console.log(`❌ ${config.description}: NOT FOUND`);
                if (config.isCritical) {
                    criticalStaleReports++;
                }
                else {
                    staleReports++;
                }
                continue;
            }
            const daysSinceUpdate = (now.getTime() - report.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
            const isStale = daysSinceUpdate > config.maxAgeDays;
            if (isStale) {
                const status = config.isCritical ? '🚨 CRITICAL' : '⚠️  STALE';
                console.log(`${status} ${config.description}: ${Math.round(daysSinceUpdate)} days old (max: ${config.maxAgeDays} days)`);
                if (config.isCritical) {
                    criticalStaleReports++;
                }
                else {
                    staleReports++;
                }
            }
            else {
                console.log(`✅ ${config.description}: ${Math.round(daysSinceUpdate)} days old (fresh)`);
                freshReports++;
            }
        }
        console.log('\n📊 FRESHNESS SUMMARY');
        console.log('====================');
        console.log(`📋 Total Reports: ${totalReports}`);
        console.log(`✅ Fresh Reports: ${freshReports}`);
        console.log(`⚠️  Stale Reports: ${staleReports}`);
        console.log(`🚨 Critical Stale: ${criticalStaleReports}`);
        console.log(`📈 Freshness Rate: ${((freshReports / totalReports) * 100).toFixed(1)}%`);
        if (criticalStaleReports > 0) {
            console.log('\n🚨 ACTION REQUIRED: Critical reports need immediate attention!');
            console.log('Run: npm run analytics:smart-update');
        }
        else if (staleReports > 0) {
            console.log('\n⚠️  RECOMMENDATION: Some reports are getting stale');
            console.log('Consider running: npm run analytics:smart-update');
        }
        else {
            console.log('\n✅ All reports are fresh and up-to-date!');
        }
        // Get content growth since last check
        const currentContentCount = await prisma.article.count();
        console.log(`\n📊 Current Content Count: ${currentContentCount.toLocaleString()} articles`);
    }
    catch (error) {
        console.error('❌ Error checking report freshness:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the freshness checker
if (require.main === module) {
    checkReportFreshness()
        .then(() => {
        console.log('\n🎉 Report freshness check completed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Report freshness check failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=check-report-freshness.js.map