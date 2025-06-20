"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlAirbnbPayouts = crawlAirbnbPayouts;
const client_1 = require("@prisma/client");
const openai_1 = require("../utils/openai");
const prisma = new client_1.PrismaClient();
const AIRBNB_PAYOUT_URLS = [
    'https://www.airbnb.com/help/article/425/when-youll-get-your-payout',
    'https://www.airbnb.com/help/article/426/how-payouts-work',
    'https://www.airbnb.com/help/article/427/payout-methods',
    'https://www.airbnb.com/help/article/428/payout-schedule',
];
async function crawlAirbnbPayouts() {
    console.log('🔄 Starting Airbnb payout documentation crawl...');
    for (const url of AIRBNB_PAYOUT_URLS) {
        try {
            console.log(`📄 Crawling: ${url}`);
            // Check if article already exists
            const existingArticle = await prisma.article.findUnique({
                where: { url }
            });
            if (existingArticle) {
                console.log(`✅ Article already exists: ${existingArticle.question}`);
                continue;
            }
            // Fetch the page content
            const response = await fetch(url);
            if (!response.ok) {
                console.log(`❌ Failed to fetch ${url}: ${response.status}`);
                continue;
            }
            const html = await response.text();
            // Extract title and content (simplified - you might want to use a proper HTML parser)
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].replace(' - Airbnb Help Center', '').trim() : 'Airbnb Payout Information';
            // Extract main content (this is a simplified approach)
            const contentMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            if (!contentMatch) {
                console.log(`❌ Could not extract content from ${url}`);
                continue;
            }
            // Clean HTML and extract text
            const content = contentMatch[1]
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (content.length < 100) {
                console.log(`❌ Content too short from ${url}`);
                continue;
            }
            // Split content into paragraphs
            const paragraphs = content
                .split(/\n\s*\n/)
                .map(p => p.trim())
                .filter(p => p.length > 50)
                .slice(0, 10); // Limit to first 10 paragraphs
            if (paragraphs.length === 0) {
                console.log(`❌ No valid paragraphs found in ${url}`);
                continue;
            }
            // Create article
            const article = await prisma.article.create({
                data: {
                    url,
                    question: title,
                    answer: paragraphs.join('\n\n'),
                    category: 'payouts',
                    platform: 'Airbnb',
                    contentType: 'official',
                    source: 'help_center',
                    contentHash: Buffer.from(content).toString('base64').slice(0, 64), // Simple hash
                }
            });
            // Create paragraphs with embeddings
            for (const paragraphText of paragraphs) {
                const embedding = await (0, openai_1.getEmbedding)(paragraphText);
                await prisma.articleParagraph.create({
                    data: {
                        articleId: article.id,
                        text: paragraphText,
                        embedding: embedding,
                    }
                });
            }
            console.log(`✅ Created article: ${title} (${paragraphs.length} paragraphs)`);
        }
        catch (error) {
            console.error(`❌ Error crawling ${url}:`, error);
        }
    }
    console.log('🎉 Airbnb payout crawl completed!');
}
// Run the script
if (require.main === module) {
    crawlAirbnbPayouts()
        .catch(console.error)
        .finally(() => prisma.$disconnect());
}
