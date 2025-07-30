"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function setupDemoUser() {
    try {
        console.log('👤 Setting up demo user...');
        // Check if demo user already exists
        const existingUser = await prisma.user.findUnique({
            where: { id: 'demo-user' }
        });
        if (existingUser) {
            console.log('✅ Demo user already exists');
            console.log(`   Email: ${existingUser.email}`);
            console.log(`   Created: ${existingUser.createdAt.toLocaleDateString()}`);
        }
        else {
            // Create demo user
            const demoUser = await prisma.user.create({
                data: {
                    id: 'demo-user',
                    email: 'demo@insightdeck.com',
                    name: 'Demo User',
                    subscriptionTier: 'premium',
                    subscriptionStatus: 'active',
                    city: 'London',
                    country: 'UK'
                }
            });
            console.log('✅ Demo user created successfully!');
            console.log(`   ID: ${demoUser.id}`);
            console.log(`   Email: ${demoUser.email}`);
            console.log(`   Tier: ${demoUser.subscriptionTier}`);
        }
        console.log('\n🎯 Demo user ready for provider linking tests');
    }
    catch (error) {
        console.error('❌ Error setting up demo user:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the setup
setupDemoUser()
    .then(() => {
    console.log('✅ Setup completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
});
//# sourceMappingURL=setup-demo-user.js.map