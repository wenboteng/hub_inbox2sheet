"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function cleanupOldGYGData() {
    try {
        console.log('🧹 Starting cleanup of old GYG data...');
        // Get today's date at midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Count total GYG activities (non-viator)
        const totalGYG = await prisma.importedGYGActivity.count({
            where: {
                NOT: {
                    tags: {
                        has: 'viator'
                    }
                }
            }
        });
        console.log(`📊 Total GYG activities before cleanup: ${totalGYG}`);
        // Count today's GYG activities
        const todayGYG = await prisma.importedGYGActivity.count({
            where: {
                importedAt: {
                    gte: today
                },
                NOT: {
                    tags: {
                        has: 'viator'
                    }
                }
            }
        });
        console.log(`📅 Today's GYG activities: ${todayGYG}`);
        // Delete old GYG activities (before today)
        const deleteResult = await prisma.importedGYGActivity.deleteMany({
            where: {
                importedAt: {
                    lt: today
                },
                NOT: {
                    tags: {
                        has: 'viator'
                    }
                }
            }
        });
        console.log(`🗑️  Deleted ${deleteResult.count} old GYG activities`);
        // Verify final count
        const finalGYG = await prisma.importedGYGActivity.count({
            where: {
                NOT: {
                    tags: {
                        has: 'viator'
                    }
                }
            }
        });
        console.log(`✅ Final GYG activities count: ${finalGYG}`);
        // Count Viator activities (should remain unchanged)
        const viatorCount = await prisma.importedGYGActivity.count({
            where: {
                tags: {
                    has: 'viator'
                }
            }
        });
        console.log(`🔗 Viator activities (unchanged): ${viatorCount}`);
        console.log('🎉 Cleanup completed successfully!');
    }
    catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the cleanup
cleanupOldGYGData()
    .then(() => {
    console.log('✅ Cleanup script completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
});
//# sourceMappingURL=cleanup-old-gyg-data.js.map