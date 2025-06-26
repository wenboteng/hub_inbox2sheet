"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = generateEmbedding;
exports.findSimilarQuestions = findSimilarQuestions;
exports.generateAnswer = generateAnswer;
exports.processSubmittedQuestion = processSubmittedQuestion;
const openai_1 = __importDefault(require("openai"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
async function generateEmbedding(text) {
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });
    return response.data[0].embedding;
}
async function findSimilarQuestions(question, limit = 5) {
    const embedding = await generateEmbedding(question);
    // Using pgvector's cosine similarity
    const similarQuestions = await prisma.$queryRaw `
    SELECT 
      id,
      question,
      answer,
      source_url as "sourceUrl",
      platform,
      category,
      tags,
      1 - (embedding <=> ${embedding}::vector) as similarity
    FROM "Answer"
    WHERE is_active = true
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;
    return similarQuestions;
}
async function generateAnswer(question, context, tone = 'professional') {
    const systemPrompt = `You are a helpful assistant for the OTA Help Hub. 
    Generate a clear and accurate answer based on the provided context.
    Adjust your tone to be ${tone}.
    If the context doesn't contain enough information, acknowledge the limitations.
    Format the response in a clear, structured way.
    Keep responses concise and to the point.`;
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Question: ${question}\n\nContext: ${context}` }
        ],
        temperature: 0.7,
        max_tokens: 500,
    });
    return response.choices[0].message.content || '';
}
async function processSubmittedQuestion(questionId) {
    const question = await prisma.submittedQuestion.findUnique({
        where: { id: questionId },
    });
    if (!question)
        throw new Error('Question not found');
    // Generate embedding for the question
    const embedding = await generateEmbedding(question.question);
    await prisma.submittedQuestion.update({
        where: { id: questionId },
        data: { embedding },
    });
    // Find similar questions
    const similarQuestions = await findSimilarQuestions(question.question);
    // Generate answer using the context from similar questions
    const context = similarQuestions
        .map((q) => `${q.question}\n${q.answer}`)
        .join('\n\n');
    const answer = await generateAnswer(question.question, context);
    // Update the question with the generated answer
    await prisma.submittedQuestion.update({
        where: { id: questionId },
        data: {
            manualAnswer: answer,
            aiGenerated: true,
            status: 'answered',
        },
    });
    return answer;
}
//# sourceMappingURL=ai.js.map