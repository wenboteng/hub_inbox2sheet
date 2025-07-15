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
// Stack Overflow API configuration with enhanced rate limiting
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
        minDelay: 2000, // Increased from 1000ms
        maxDelay: 4000, // Increased from 2000ms
        maxRequestsPerHour: 100, // Conservative limit
        maxRequestsPerDay: 1000, // Conservative limit
    },
    maxQuestionsPerTag: 30, // Reduced from 50 to avoid rate limits
    maxAnswersPerQuestion: 5, // Reduced from 10 to avoid rate limits
    retryAttempts: 2,
    exponentialBackoff: true,
    respectThrottleHeaders: true,
};
// Rate limiting state
let requestCount = 0;
let lastRequestTime = 0;
let throttleUntil = 0;
// Helper function to get random delay within range
function getRandomDelay() {
    return Math.floor(Math.random() *
        (STACK_OVERFLOW_CONFIG.rateLimit.maxDelay - STACK_OVERFLOW_CONFIG.rateLimit.minDelay) +
        STACK_OVERFLOW_CONFIG.rateLimit.minDelay);
}
// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// Enhanced rate limiting function
async function enforceRateLimit() {
    const now = Date.now();
    // Check if we're currently throttled
    if (now < throttleUntil) {
        const waitTime = throttleUntil - now;
        console.log(`[STACKOVERFLOW] Throttled until ${new Date(throttleUntil).toISOString()}, waiting ${waitTime}ms...`);
        await delay(waitTime);
    }
    // Check hourly limit
    if (requestCount >= STACK_OVERFLOW_CONFIG.rateLimit.maxRequestsPerHour) {
        const timeSinceFirstRequest = now - lastRequestTime;
        if (timeSinceFirstRequest < 3600000) { // 1 hour in ms
            const waitTime = 3600000 - timeSinceFirstRequest;
            console.log(`[STACKOVERFLOW] Hourly limit reached, waiting ${waitTime}ms...`);
            await delay(waitTime);
            requestCount = 0;
        }
        else {
            requestCount = 0;
        }
    }
    // Ensure minimum delay between requests
    const timeSinceLastRequest = now - lastRequestTime;
    const minDelay = getRandomDelay();
    if (timeSinceLastRequest < minDelay) {
        const waitTime = minDelay - timeSinceLastRequest;
        await delay(waitTime);
    }
    lastRequestTime = Date.now();
    requestCount++;
}
// Enhanced API request function with better error handling
async function makeApiRequest(endpoint, params, attempt = 1) {
    try {
        await enforceRateLimit();
        console.log(`[STACKOVERFLOW] Making API request to ${endpoint} (attempt ${attempt})`);
        const response = await axios_1.default.get(`${STACK_OVERFLOW_CONFIG.baseUrl}${endpoint}`, {
            params,
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
            },
        });
        // Check for throttle headers
        if (STACK_OVERFLOW_CONFIG.respectThrottleHeaders) {
            const throttleRemaining = response.headers['x-ratelimit-remaining'];
            const throttleReset = response.headers['x-ratelimit-reset'];
            if (throttleRemaining === '0' && throttleReset) {
                const resetTime = parseInt(throttleReset) * 1000; // Convert to milliseconds
                throttleUntil = Date.now() + resetTime;
                console.log(`[STACKOVERFLOW] Rate limit reset in ${resetTime}ms`);
            }
        }
        return response.data;
    }
    catch (error) {
        if (error.response?.status === 429) {
            console.log(`[STACKOVERFLOW] Rate limited (429) for ${endpoint}`);
            // Parse throttle information from response
            const throttleMessage = error.response.headers['x-error-message'];
            const throttleName = error.response.headers['x-error-name'];
            if (throttleMessage && throttleName === 'throttle_violation') {
                // Extract wait time from message (e.g., "more requests available in 14385 seconds")
                const match = throttleMessage.match(/(\d+) seconds/);
                if (match) {
                    const waitSeconds = parseInt(match[1]);
                    throttleUntil = Date.now() + (waitSeconds * 1000);
                    console.log(`[STACKOVERFLOW] Throttle violation, waiting ${waitSeconds} seconds...`);
                }
            }
            if (attempt < STACK_OVERFLOW_CONFIG.retryAttempts) {
                const backoffDelay = STACK_OVERFLOW_CONFIG.exponentialBackoff ?
                    Math.min(30000 * Math.pow(2, attempt), 300000) : 30000; // Max 5 minutes
                console.log(`[STACKOVERFLOW] Retrying in ${backoffDelay}ms...`);
                await delay(backoffDelay);
                return makeApiRequest(endpoint, params, attempt + 1);
            }
        }
        if (error.response?.status === 400) {
            console.log(`[STACKOVERFLOW] Bad request (400) for ${endpoint}: ${error.response.data?.error_message || 'Unknown error'}`);
            return { items: [] }; // Return empty result instead of throwing
        }
        throw error;
    }
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
        const params = {
            site: STACK_OVERFLOW_CONFIG.site,
            tagged: tag,
            sort: 'votes',
            order: 'desc',
            pagesize: STACK_OVERFLOW_CONFIG.maxQuestionsPerTag,
            filter: 'withbody', // Include question body
        };
        const data = await makeApiRequest('/questions', params);
        if (data && data.items) {
            console.log(`[STACKOVERFLOW] Found ${data.items.length} questions for tag: ${tag}`);
            return data.items;
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
        const params = {
            site: STACK_OVERFLOW_CONFIG.site,
            sort: 'votes',
            order: 'desc',
            pagesize: STACK_OVERFLOW_CONFIG.maxAnswersPerQuestion,
            filter: 'withbody', // Include answer body
        };
        const data = await makeApiRequest(`/questions/${questionId}/answers`, params);
        if (data && data.items) {
            console.log(`[STACKOVERFLOW] Found ${data.items.length} answers for question: ${questionId}`);
            return data.items;
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
    // Convert question to post
    const questionPost = {
        platform: 'StackOverflow',
        url: `https://stackoverflow.com/questions/${question.question_id}`,
        question: question.title,
        answer: question.body,
        author: question.owner?.display_name,
        date: new Date(question.creation_date * 1000).toISOString(),
        category: 'StackOverflow',
        contentType: 'community',
        source: 'community',
        score: question.score,
        tags: question.tags,
    };
    posts.push(questionPost);
    // Convert answers to posts
    for (const answer of answers) {
        const answerPost = {
            platform: 'StackOverflow',
            url: `https://stackoverflow.com/a/${answer.answer_id}`,
            question: question.title, // Use question title for context
            answer: answer.body,
            author: answer.owner?.display_name,
            date: new Date(answer.creation_date * 1000).toISOString(),
            category: 'StackOverflow',
            contentType: 'community',
            source: 'community',
            score: answer.score,
            isAccepted: answer.is_accepted,
        };
        posts.push(answerPost);
    }
    return posts;
}
// Save posts to database
async function saveToDatabase(posts) {
    for (const post of posts) {
        try {
            await prisma.article.upsert({
                where: { url: post.url },
                create: {
                    url: post.url,
                    question: post.question,
                    answer: post.answer,
                    slug: post.question.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50),
                    platform: post.platform,
                    category: post.category || 'StackOverflow',
                    contentType: post.contentType,
                    source: post.source,
                    author: post.author,
                    votes: post.score || 0,
                },
                update: {
                    question: post.question,
                    answer: post.answer,
                    author: post.author,
                    votes: post.score || 0,
                },
            });
        }
        catch (error) {
            console.error(`[STACKOVERFLOW] Failed to save post ${post.url}:`, error);
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