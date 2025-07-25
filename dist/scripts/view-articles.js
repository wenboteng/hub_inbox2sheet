"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    try {
        // Get all articles, sorted by lastUpdated
        const articles = await prisma.article.findMany({
            orderBy: {
                lastUpdated: 'desc'
            }
        });
        console.log(`Found ${articles.length} articles:\n`);
        for (const article of articles) {
            console.log(`Platform: ${article.platform}`);
            console.log(`Category: ${article.category}`);
            console.log(`URL: ${article.url}`);
            console.log(`Title: ${article.question}`);
            console.log(`Last Updated: ${article.lastUpdated}`);
            console.log(`Content Preview: ${article.answer.slice(0, 200)}...`);
            console.log('-------------------\n');
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=view-articles.js.map