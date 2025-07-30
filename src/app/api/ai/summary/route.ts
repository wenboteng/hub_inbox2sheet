import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAuth, checkAiUsageLimit, incrementAiUsage } from '../../../../lib/auth';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const { questionId, type = 'summary' } = await request.json();

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Check AI usage limits
    const usageCheck = await checkAiUsageLimit(user.userId);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'AI usage limit reached',
          limit: usageCheck.remaining,
          tier: user.subscriptionTier
        },
        { status: 429 }
      );
    }

    // Get the question content
    const article = await prisma.article.findUnique({
      where: { id: questionId }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Check if AI content already exists
    let existingContent = '';
    let updateField = '';
    
    switch (type) {
      case 'summary':
        if (article.aiSummaryGenerated && article.aiSummary) {
          return NextResponse.json({ summary: article.aiSummary });
        }
        updateField = 'aiSummary';
        break;
      case 'keypoints':
        if (article.keyPointsGenerated && article.keyPoints.length > 0) {
          return NextResponse.json({ keyPoints: article.keyPoints });
        }
        updateField = 'keyPoints';
        break;
      case 'actionitems':
        if (article.actionItemsGenerated && article.actionItems.length > 0) {
          return NextResponse.json({ actionItems: article.actionItems });
        }
        updateField = 'actionItems';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid content type' },
          { status: 400 }
        );
    }

    // Generate AI content based on type
    let aiContent: string | string[] = '';
    let prompt = '';

    switch (type) {
      case 'summary':
        prompt = `Summarize this tour vendor question and answer in 2-3 sentences, focusing on actionable insights for tour operators:

Question: ${article.question}
Answer: ${article.answer}

Provide a concise summary that highlights the key points for tour vendors.`;
        break;
      
      case 'keypoints':
        prompt = `Extract 3-5 key points from this tour vendor content that would be most valuable for tour operators:

Question: ${article.question}
Answer: ${article.answer}

Return only the key points as a JSON array of strings, no additional text.`;
        break;
      
      case 'actionitems':
        prompt = `Extract 3-5 actionable steps that tour vendors can take based on this content:

Question: ${article.question}
Answer: ${article.answer}

Return only the action items as a JSON array of strings, starting each with a verb (e.g., "Research", "Implement", "Monitor").`;
        break;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant for tour vendors and operators. Provide concise, actionable insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    aiContent = completion.choices[0]?.message?.content || '';

    // Parse JSON for keypoints and actionitems
    if (type === 'keypoints' || type === 'actionitems') {
      try {
        const parsed = JSON.parse(aiContent);
        aiContent = parsed;
      } catch (e) {
        // If JSON parsing fails, split by newlines and clean up
        const fallbackContent = (aiContent as string)
          .split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => line.replace(/^[-*•]\s*/, '').trim());
        aiContent = fallbackContent;
      }
    }

    // Update the article with generated content
    const updateData: any = {
      [`${updateField}Generated`]: true,
      [`${updateField}RequestedAt`]: new Date(),
      summaryGeneratedAt: new Date(),
    };

    if (type === 'summary') {
      updateData.aiSummary = aiContent;
    } else if (type === 'keypoints') {
      updateData.keyPoints = aiContent;
    } else if (type === 'actionitems') {
      updateData.actionItems = aiContent;
    }

    await prisma.article.update({
      where: { id: questionId },
      data: updateData
    });

    // Increment AI usage
    await incrementAiUsage(user.userId);

    // Return the generated content
    const response: any = {};
    if (type === 'summary') {
      response.summary = aiContent;
    } else if (type === 'keypoints') {
      response.keyPoints = aiContent;
    } else if (type === 'actionitems') {
      response.actionItems = aiContent;
    }

    return NextResponse.json({
      ...response,
      usage: await checkAiUsageLimit(user.userId)
    });

  } catch (error) {
    console.error('AI summary generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI content' },
      { status: 500 }
    );
  }
}); 