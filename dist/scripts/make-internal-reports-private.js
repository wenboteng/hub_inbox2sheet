"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../src/lib/prisma"));
async function makeInternalReportsPrivate() {
    console.log('🔒 Making internal reports private...\n');
    try {
        // List of internal reports that should be private
        const internalReportTypes = [
            'executive-summary',
            'tour-vendor-business-intelligence'
        ];
        for (const reportType of internalReportTypes) {
            const report = await prisma_1.default.report.findUnique({
                where: { type: reportType }
            });
            if (report) {
                await prisma_1.default.report.update({
                    where: { type: reportType },
                    data: { isPublic: false }
                });
                console.log(`✅ Made "${report.title}" private`);
            }
            else {
                console.log(`⚠️  Report type "${reportType}" not found`);
            }
        }
        // Show current status of all reports
        console.log('\n📊 Current Report Status:');
        const allReports = await prisma_1.default.report.findMany({
            orderBy: { updatedAt: 'desc' }
        });
        allReports.forEach(report => {
            const status = report.isPublic ? '🌐 Public' : '🔒 Private';
            console.log(`${status} - ${report.title} (${report.type})`);
        });
        console.log('\n🎉 Internal reports are now private!');
        console.log('Tour vendors will no longer see these reports on the public reports page.');
    }
    catch (error) {
        console.error('❌ Error making reports private:', error);
    }
    finally {
        await prisma_1.default.$disconnect();
    }
}
// Run the script if this file is executed directly
if (require.main === module) {
    makeInternalReportsPrivate()
        .then(() => {
        console.log('\n🏁 Script finished');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=make-internal-reports-private.js.map