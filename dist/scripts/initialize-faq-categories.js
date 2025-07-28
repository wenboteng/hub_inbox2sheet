"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAQ_CATEGORIES = void 0;
exports.initializeFAQCategories = initializeFAQCategories;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// FAQ Categories for tour vendors
const FAQ_CATEGORIES = [
    {
        name: 'Pricing & Revenue',
        description: 'Strategies for pricing tours, revenue optimization, and financial management',
        icon: '💰',
        color: '#10B981',
        priority: 1,
    },
    {
        name: 'Marketing & SEO',
        description: 'Digital marketing, SEO strategies, and promotional techniques',
        icon: '📈',
        color: '#3B82F6',
        priority: 2,
    },
    {
        name: 'Customer Service',
        description: 'Guest relations, customer support, and service excellence',
        icon: '🎯',
        color: '#F59E0B',
        priority: 3,
    },
    {
        name: 'Technical Setup',
        description: 'Platform configuration, technical requirements, and system setup',
        icon: '⚙️',
        color: '#8B5CF6',
        priority: 4,
    },
    {
        name: 'Booking & Cancellations',
        description: 'Reservation management, cancellation policies, and booking optimization',
        icon: '📅',
        color: '#EF4444',
        priority: 5,
    },
    {
        name: 'Policies & Legal',
        description: 'Legal requirements, terms of service, and compliance',
        icon: '⚖️',
        color: '#6B7280',
        priority: 6,
    },
    {
        name: 'Community Insights',
        description: 'Real experiences and advice from the travel community',
        icon: '👥',
        color: '#EC4899',
        priority: 7,
    },
    {
        name: 'Expert Advice',
        description: 'Professional insights and industry best practices',
        icon: '🎓',
        color: '#059669',
        priority: 8,
    },
    {
        name: 'Technical Solutions',
        description: 'Technical problems and their solutions',
        icon: '🔧',
        color: '#DC2626',
        priority: 9,
    },
    {
        name: 'General',
        description: 'General questions and miscellaneous topics',
        icon: '📚',
        color: '#9CA3AF',
        priority: 10,
    },
];
exports.FAQ_CATEGORIES = FAQ_CATEGORIES;
async function initializeFAQCategories() {
    console.log('🏗️ Initializing FAQ categories...');
    try {
        await prisma.$connect();
        console.log('✅ Database connected');
        // For now, we'll use the existing Article table to store FAQ categories
        // We'll create a special category for FAQ content
        const faqCategory = {
            name: 'FAQ System',
            description: 'Tour vendor FAQ system categories',
            icon: '❓',
            color: '#6366F1',
            priority: 0,
        };
        console.log('📝 Creating FAQ system category...');
        // We'll store this in the Report table as a configuration
        await prisma.report.upsert({
            where: { type: 'faq_categories' },
            update: {
                title: 'FAQ Categories',
                content: JSON.stringify(FAQ_CATEGORIES),
                updatedAt: new Date(),
            },
            create: {
                type: 'faq_categories',
                title: 'FAQ Categories',
                content: JSON.stringify(FAQ_CATEGORIES),
                slug: 'faq-categories',
            },
        });
        console.log('✅ FAQ categories initialized successfully');
        console.log(`📊 Created ${FAQ_CATEGORIES.length} categories:`);
        FAQ_CATEGORIES.forEach((category, index) => {
            console.log(`   ${index + 1}. ${category.name} ${category.icon}`);
        });
        console.log('\n🎉 FAQ system is ready!');
        console.log('Next steps:');
        console.log('1. Start content collection: npm run collect:oxylabs');
        console.log('2. Visit the FAQ page: http://localhost:3000/faq');
    }
    catch (error) {
        console.error('❌ Failed to initialize FAQ categories:', error);
    }
    finally {
        await prisma.$disconnect();
        console.log('🔌 Database disconnected');
    }
}
// Run if called directly
if (require.main === module) {
    initializeFAQCategories().catch(console.error);
}
//# sourceMappingURL=initialize-faq-categories.js.map