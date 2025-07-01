#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function cleanupAirbnbRedirects() {
    console.log('🧹 Cleaning up Airbnb Community redirects');
    console.log('==========================================');
    try {
        // Find articles that appear to be redirects
        const redirectArticles = await prisma.article.findMany({
            where: {
                platform: 'Airbnb',
                source: 'community',
                OR: [
                    {
                        question: {
                            contains: 'Douchescherm'
                        }
                    },
                    {
                        question: {
                            contains: 'beschadigd'
                        }
                    },
                    {
                        answer: {
                            contains: 'Douchescherm'
                        }
                    },
                    {
                        answer: {
                            contains: 'beschadigd'
                        }
                    }
                ]
            },
            select: {
                id: true,
                url: true,
                question: true,
                answer: true,
                createdAt: true
            }
        });
        console.log(`📊 Found ${redirectArticles.length} articles that appear to be redirects`);
        if (redirectArticles.length > 0) {
            console.log('\n🗑️  Articles to be deleted:');
            redirectArticles.forEach(article => {
                console.log(`  - ${article.question} (${article.url})`);
                console.log(`    Created: ${article.createdAt}`);
                console.log(`    Content: ${article.answer.substring(0, 100)}...`);
            });
            // Delete the redirect articles
            const deleteResult = await prisma.article.deleteMany({
                where: {
                    id: {
                        in: redirectArticles.map(a => a.id)
                    }
                }
            });
            console.log(`\n✅ Deleted ${deleteResult.count} redirect articles`);
        }
        else {
            console.log('✅ No redirect articles found to clean up');
        }
        // Show remaining Airbnb Community articles
        const remainingArticles = await prisma.article.findMany({
            where: {
                platform: 'Airbnb',
                source: 'community'
            },
            select: {
                id: true,
                url: true,
                question: true,
                author: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        console.log(`\n📊 Remaining Airbnb Community articles: ${remainingArticles.length}`);
        remainingArticles.forEach(article => {
            console.log(`  - ${article.question} (${article.author || 'Unknown'})`);
        });
    }
    catch (error) {
        console.error('❌ Error during cleanup:', error.message);
    }
    finally {
        await prisma.$disconnect();
    }
}
cleanupAirbnbRedirects();
//# sourceMappingURL=cleanup-airbnb-redirects.js.map