import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI-powered categorization function
async function categorizeContentWithAI(content: string, question: string): Promise<{ category: string; confidence: number }> {
  try {
    const prompt = `Analyze this content and categorize it into one of these categories:
- Pricing & Revenue
- Marketing & SEO
- Customer Service
- Technical Setup
- Booking & Cancellations
- Policies & Legal
- Technical Solutions
- Community Insights
- Expert Advice
- General

Content: ${content.substring(0, 500)}
Question: ${question}

Return only a JSON object: {"category": "string", "confidence": number}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 100
    });

    let responseContent = response.choices[0].message.content || '{"category": "General", "confidence": 0.5}';
    
    // Clean up markdown formatting if present
    responseContent = responseContent
      .replace(/```json\s*/g, '')  // Remove opening ```json
      .replace(/```\s*$/g, '')     // Remove closing ```
      .replace(/^```\s*/g, '')     // Remove opening ``` at start
      .trim();
    
    try {
      const result = JSON.parse(responseContent);
      return {
        category: result.category || "General",
        confidence: result.confidence || 0.5
      };
    } catch (parseError) {
      console.error('JSON parse error, using fallback:', parseError);
      console.error('Raw response:', responseContent);
      return { category: "General", confidence: 0.5 };
    }
  } catch (error) {
    console.error('Error categorizing content with AI:', error);
    return { category: "General", confidence: 0.5 };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const article = await prisma.article.findUnique({
      where: { id: params.id }
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Generate AI categorization
    const categorization = await categorizeContentWithAI(article.answer, article.question);
    
    // Update database with new categorization
    await prisma.article.update({
      where: { id: params.id },
      data: {
        category: categorization.category,
        categoryConfidence: categorization.confidence,
        categoryUpdatedAt: new Date()
      } as any
    });

    return NextResponse.json({
      category: categorization.category,
      confidence: categorization.confidence,
      generated: true
    });

  } catch (error) {
    console.error('Error generating AI categorization:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI categorization' },
      { status: 500 }
    );
  }
} 