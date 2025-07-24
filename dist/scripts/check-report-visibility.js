"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkReportVisibility = checkReportVisibility;
const dual_prisma_1 = require("../src/lib/dual-prisma");
async function checkReportVisibility() {
    console.log('🔍 CHECKING REPORT VISIBILITY STATUS...\n');
    try {
        await dual_prisma_1.mainPrisma.$connect();
        console.log('✅ Connected to main database');
        // Check all reports that should be private
        const reportsToCheck = [
            'review-count-backfill-report',
            'import-process-fix-report',
            'raw-review-data-analysis',
            'vienna-activities-verification',
            'vienna-activities-analysis'
        ];
        console.log('📊 CHECKING REPORT VISIBILITY:');
        for (const reportType of reportsToCheck) {
            const report = await dual_prisma_1.mainPrisma.report.findFirst({
                where: { type: reportType },
                select: {
                    type: true,
                    title: true,
                    slug: true,
                    isPublic: true,
                    updatedAt: true
                }
            });
            if (report) {
                const status = report.isPublic ? '🔴 PUBLIC' : '🟢 PRIVATE';
                console.log(`   ${report.title}`);
                console.log(`      Type: ${report.type}`);
                console.log(`      Slug: ${report.slug}`);
                console.log(`      Status: ${status}`);
                console.log(`      Updated: ${report.updatedAt.toISOString().split('T')[0]}`);
                console.log('');
            }
            else {
                console.log(`   ❌ Report not found: ${reportType}`);
                console.log('');
            }
        }
        // Check Vienna Pricing Report (should be public)
        const viennaReport = await dual_prisma_1.mainPrisma.report.findFirst({
            where: { type: 'vienna-pricing-intelligence-report' },
            select: {
                type: true,
                title: true,
                slug: true,
                isPublic: true,
                updatedAt: true
            }
        });
        if (viennaReport) {
            const status = viennaReport.isPublic ? '🟢 PUBLIC' : '🔴 PRIVATE';
            console.log('🎯 VIENNA PRICING REPORT STATUS:');
            console.log(`   ${viennaReport.title}`);
            console.log(`      Type: ${viennaReport.type}`);
            console.log(`      Slug: ${viennaReport.slug}`);
            console.log(`      Status: ${status}`);
            console.log(`      Updated: ${viennaReport.updatedAt.toISOString().split('T')[0]}`);
            console.log('');
        }
        // Fix reports that should be private
        console.log('🔧 FIXING REPORT VISIBILITY...');
        const reportsToMakePrivate = [
            'review-count-backfill-report',
            'import-process-fix-report',
            'raw-review-data-analysis',
            'vienna-activities-verification',
            'vienna-activities-analysis'
        ];
        let fixedCount = 0;
        for (const reportType of reportsToMakePrivate) {
            const result = await dual_prisma_1.mainPrisma.report.updateMany({
                where: {
                    type: reportType,
                    isPublic: true // Only update if currently public
                },
                data: {
                    isPublic: false,
                    updatedAt: new Date()
                }
            });
            if (result.count > 0) {
                console.log(`   ✅ Made ${reportType} private`);
                fixedCount++;
            }
            else {
                console.log(`   ℹ️  ${reportType} already private or not found`);
            }
        }
        // Ensure Vienna Pricing Report is public
        const viennaResult = await dual_prisma_1.mainPrisma.report.updateMany({
            where: {
                type: 'vienna-pricing-intelligence-report',
                isPublic: false // Only update if currently private
            },
            data: {
                isPublic: true,
                updatedAt: new Date()
            }
        });
        if (viennaResult.count > 0) {
            console.log(`   ✅ Made Vienna Pricing Report public`);
            fixedCount++;
        }
        else {
            console.log(`   ℹ️  Vienna Pricing Report already public`);
        }
        console.log(`\n📊 SUMMARY:`);
        console.log(`   Reports fixed: ${fixedCount}`);
        console.log(`   Total reports checked: ${reportsToCheck.length + 1}`);
        // Verify the changes
        console.log('\n🔍 VERIFICATION AFTER FIXES:');
        for (const reportType of reportsToCheck) {
            const report = await dual_prisma_1.mainPrisma.report.findFirst({
                where: { type: reportType },
                select: { title: true, isPublic: true }
            });
            if (report) {
                const status = report.isPublic ? '🔴 STILL PUBLIC' : '🟢 NOW PRIVATE';
                console.log(`   ${report.title}: ${status}`);
            }
        }
        const viennaFinal = await dual_prisma_1.mainPrisma.report.findFirst({
            where: { type: 'vienna-pricing-intelligence-report' },
            select: { title: true, isPublic: true }
        });
        if (viennaFinal) {
            const status = viennaFinal.isPublic ? '🟢 PUBLIC' : '🔴 PRIVATE';
            console.log(`   ${viennaFinal.title}: ${status}`);
        }
        console.log('\n🚀 DEPLOYMENT REQUIRED:');
        console.log('   After these database changes, you need to deploy:');
        console.log('   git add .');
        console.log('   git commit -m "Fix report visibility settings"');
        console.log('   git push origin main');
        return {
            reportsChecked: reportsToCheck.length + 1,
            reportsFixed: fixedCount
        };
    }
    catch (error) {
        console.error('❌ Error checking report visibility:', error);
        throw error;
    }
    finally {
        await dual_prisma_1.mainPrisma.$disconnect();
    }
}
// Run the script
if (require.main === module) {
    checkReportVisibility().catch(console.error);
}
//# sourceMappingURL=check-report-visibility.js.map