"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlStackOverflow = crawlStackOverflow;
exports.testStackOverflowCrawler = testStackOverflowCrawler;
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Stack Overflow API configuration
const STACK_OVERFLOW_CONFIG = {
    baseUrl: 'https://api.stackexchange.com/2.3',
    site: 'stackoverflow',
    tags: [
        'airbnb',
        'travel',
        'tourism',
        'booking',
        'hotels',
        'vacation-rental',
        'travel-api',
        'booking-api',
        'trip-planning',
        'travel-website'
    ],
    rateLimit: {
        minDelay: 1000,
        maxDelay: 2000,
    },
    maxQuestionsPerTag: 50,
    maxAnswersPerQuestion: 10,
};
// Helper function to delay between requests
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// Helper function to get random delay within range
function getRandomDelay() {
    return Math.floor(Math.random() *
        (STACK_OVERFLOW_CONFIG.rateLimit.maxDelay - STACK_OVERFLOW_CONFIG.rateLimit.minDelay) +
        STACK_OVERFLOW_CONFIG.rateLimit.minDelay);
}
// Clean HTML content from Stack Overflow
function cleanHtmlContent(html) {
    return html
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
        .replace(/&amp;/g, '&') // Replace &amp; with &
        .replace(/&lt;/g, '<') // Replace &lt; with <
        .replace(/&gt;/g, '>') // Replace &gt; with >
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
}
// Get questions for a specific tag
async function getQuestionsForTag(tag) {
    console.log(`[STACKOVERFLOW] Fetching questions for tag: ${tag}`);
    try {
        const url = `${STACK_OVERFLOW_CONFIG.baseUrl}/questions`;
        const params = {
            site: STACK_OVERFLOW_CONFIG.site,
            tagged: tag,
            sort: 'votes',
            order: 'desc',
            pagesize: STACK_OVERFLOW_CONFIG.maxQuestionsPerTag,
            filter: 'withbody', // Include question body
        };
        const response = await axios_1.default.get(url, { params });
        if (response.data && response.data.items) {
            console.log(`[STACKOVERFLOW] Found ${response.data.items.length} questions for tag: ${tag}`);
            return response.data.items;
        }
        return [];
    }
    catch (error) {
        console.error(`[STACKOVERFLOW][ERROR] Failed to fetch questions for tag ${tag}:`, error);
        return [];
    }
}
// Get answers for a specific question
async function getAnswersForQuestion(questionId) {
    console.log(`[STACKOVERFLOW] Fetching answers for question: ${questionId}`);
    try {
        const url = `${STACK_OVERFLOW_CONFIG.baseUrl}/questions/${questionId}/answers`;
        const params = {
            site: STACK_OVERFLOW_CONFIG.site,
            sort: 'votes',
            order: 'desc',
            pagesize: STACK_OVERFLOW_CONFIG.maxAnswersPerQuestion,
            filter: 'withbody', // Include answer body
        };
        const response = await axios_1.default.get(url, { params });
        if (response.data && response.data.items) {
            console.log(`[STACKOVERFLOW] Found ${response.data.items.length} answers for question: ${questionId}`);
            return response.data.items;
        }
        return [];
    }
    catch (error) {
        console.error(`[STACKOVERFLOW][ERROR] Failed to fetch answers for question ${questionId}:`, error);
        return [];
    }
}
// Convert Stack Overflow data to our format
function convertToStackOverflowPost(question, answers) {
    const posts = [];
    // Create main question post
    const questionPost = {
        platform: 'StackOverflow',
        url: question.link,
        question: cleanHtmlContent(question.title),
        answer: cleanHtmlContent(question.body),
        author: question.owner?.display_name,
        date: new Date(question.creation_date * 1000).toISOString(),
        category: question.tags.join(', '),
        contentType: 'community',
        source: 'community',
        score: question.score,
        tags: question.tags,
        isAccepted: false,
    };
    posts.push(questionPost);
    // Add answer posts
    answers.forEach(answer => {
        const answerPost = {
            platform: 'StackOverflow',
            url: `${question.link}#${answer.answer_id}`,
            question: cleanHtmlContent(question.title),
            answer: cleanHtmlContent(answer.body),
            author: answer.owner?.display_name,
            date: new Date(answer.creation_date * 1000).toISOString(),
            category: question.tags.join(', '),
            contentType: 'community',
            source: 'community',
            score: answer.score,
            tags: question.tags,
            isAccepted: answer.is_accepted,
        };
        posts.push(answerPost);
    });
    return posts;
}
// Save posts to database
async function saveToDatabase(posts) {
    console.log(`[STACKOVERFLOW] Saving ${posts.length} posts to database`);
    for (const post of posts) {
        try {
            // Check if post already exists
            const existing = await prisma.article.findFirst({
                where: { url: post.url }
            });
            if (!existing) {
                await prisma.article.create({
                    data: {
                        url: post.url,
                        question: post.question,
                        answer: post.answer,
                        slug: post.question.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50),
                        author: post.author || 'Unknown',
                        category: post.category || 'StackOverflow',
                        contentType: post.contentType,
                        source: post.source,
                        platform: post.platform,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }
                });
            }
        }
        catch (error) {
            console.error(`[STACKOVERFLOW][ERROR] Failed to save post:`, error);
        }
    }
}
// Main crawling function
async function crawlStackOverflow() {
    console.log('[STACKOVERFLOW] Starting Stack Overflow crawler...');
    const allPosts = [];
    for (const tag of STACK_OVERFLOW_CONFIG.tags) {
        try {
            console.log(`[STACKOVERFLOW] Processing tag: ${tag}`);
            // Get questions for this tag
            const questions = await getQuestionsForTag(tag);
            for (const question of questions) {
                try {
                    // Get answers for this question
                    const answers = await getAnswersForQuestion(question.question_id);
                    // Convert to our format
                    const posts = convertToStackOverflowPost(question, answers);
                    allPosts.push(...posts);
                    // Save to database
                    await saveToDatabase(posts);
                    // Random delay between questions
                    await delay(getRandomDelay());
                }
                catch (error) {
                    console.error(`[STACKOVERFLOW][ERROR] Failed to process question ${question.question_id}:`, error);
                }
            }
            // Delay between tags
            await delay(getRandomDelay());
        }
        catch (error) {
            console.error(`[STACKOVERFLOW][ERROR] Failed to process tag ${tag}:`, error);
        }
    }
    console.log(`[STACKOVERFLOW] Crawling completed. Total posts: ${allPosts.length}`);
    return allPosts;
}
// Test function
async function testStackOverflowCrawler() {
    console.log('[STACKOVERFLOW] Testing crawler with limited data...');
    const testTags = ['airbnb', 'travel'];
    const testPosts = [];
    for (const tag of testTags) {
        const questions = await getQuestionsForTag(tag);
        const limitedQuestions = questions.slice(0, 2); // Only test with 2 questions per tag
        for (const question of limitedQuestions) {
            const answers = await getAnswersForQuestion(question.question_id);
            const posts = convertToStackOverflowPost(question, answers);
            testPosts.push(...posts);
            await delay(getRandomDelay());
        }
        await delay(getRandomDelay());
    }
    console.log(`[STACKOVERFLOW] Test completed. Found ${testPosts.length} posts`);
    console.log('[STACKOVERFLOW] Sample posts:');
    testPosts.slice(0, 3).forEach((post, index) => {
        console.log(`${index + 1}. ${post.question.substring(0, 100)}...`);
    });
}
//# sourceMappingURL=stackoverflow.js.map