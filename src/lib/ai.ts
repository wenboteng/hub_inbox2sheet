import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type Tone = 'professional' | 'friendly' | 'empathetic';

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export async function findSimilarQuestions(question: string, limit: number = 5) {
  const embedding = await generateEmbedding(question);
  
  // Using pgvector's cosine similarity
  const similarQuestions = await prisma.$queryRaw`
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

export async function generateAnswer(
  question: string,
  context: string,
  tone: Tone = 'professional'
): Promise<string> {
  const systemPrompt = `You are a helpful assistant for the OTA Help Hub. 
    Generate a clear and accurate answer based on the provided context.
    Adjust your tone to be ${tone}.
    If the context doesn't contain enough information, acknowledge the limitations.
    Format the response in a clear, structured way.
    Keep responses concise and to the point.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-0125-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Question: ${question}\n\nContext: ${context}` }
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return response.choices[0].message.content || '';
}

export async function processSubmittedQuestion(questionId: string) {
  const question = await prisma.submittedQuestion.findUnique({
    where: { id: questionId },
  });

  if (!question) throw new Error('Question not found');

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
    .map((q: any) => `${q.question}\n${q.answer}`)
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