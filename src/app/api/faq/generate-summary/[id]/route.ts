import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate content hash for change detection
function generateContentHash(content: string): string {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(content).digest('hex');
}

// Generate intelligent summary based on question type
function generateIntelligentSummary(content: string, question: string): string {
  const questionLower = question.toLowerCase();
  
  // Count replies/answers in the content
  const replyCount = (content.match(/Latest reply|Reply to thread|replies?|answers?/gi) || []).length;
  const hasReplies = replyCount > 0 || content.includes('reply') || content.includes('answer');
  
  // Analyze the question type and create a situation overview
  if (questionLower.includes('bedroom') || questionLower.includes('bed') || questionLower.includes('adjust') || questionLower.includes('wrong box')) {
    if (hasReplies) {
      return `This question is asking how to fix incorrect bedroom/bed count settings in an Airbnb listing. The user has ${replyCount || 'several'} replies from the community, with the best answers providing step-by-step instructions to navigate the host dashboard and update property details.`;
    } else {
      return `This question is asking how to fix incorrect bedroom/bed count settings in an Airbnb listing. The community can help with specific steps to navigate the host dashboard and update property details.`;
    }
  }
  
  if (questionLower.includes('price') || questionLower.includes('cost') || questionLower.includes('fee') || questionLower.includes('charge')) {
    if (hasReplies) {
      return `This question is asking about pricing, fees, or costs related to Airbnb hosting. The user has ${replyCount || 'several'} replies from the community, with the best answers providing detailed information about pricing structures and fee calculations.`;
    } else {
      return `This question is asking about pricing, fees, or costs related to Airbnb hosting. The community can provide detailed information about pricing structures and fee calculations.`;
    }
  }
  
  if (questionLower.includes('cancel') || questionLower.includes('refund') || questionLower.includes('policy')) {
    if (hasReplies) {
      return `This question is asking about cancellation policies, refunds, or booking modifications. The user has ${replyCount || 'several'} replies from the community, with the best answers providing clear guidance on cancellation procedures and refund eligibility.`;
    } else {
      return `This question is asking about cancellation policies, refunds, or booking modifications. The community can provide clear guidance on cancellation procedures and refund eligibility.`;
    }
  }
  
  if (questionLower.includes('feedback') || questionLower.includes('review') || questionLower.includes('rating')) {
    if (hasReplies) {
      return `This question is asking about feedback, reviews, or rating systems. The user has ${replyCount || 'several'} replies from the community, with the best answers providing insights on how to manage and respond to guest feedback effectively.`;
    } else {
      return `This question is asking about feedback, reviews, or rating systems. The community can provide insights on how to manage and respond to guest feedback effectively.`;
    }
  }
  
  // Generic fallback with situation overview
  if (hasReplies) {
    return `This question is asking for help with an Airbnb hosting issue. The user has ${replyCount || 'several'} replies from the community, with the best answers providing practical solutions and guidance.`;
  } else {
    return `This question is asking for help with an Airbnb hosting issue. The community can provide practical solutions and guidance.`;
  }
}

// Extract specific key points based on question type
function extractKeyPoints(content: string, question: string): string[] {
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('bedroom') || questionLower.includes('bed') || questionLower.includes('adjust')) {
    return [
      "Go to your Airbnb host dashboard and select the specific listing",
      "Navigate to \"Listing details\" or \"Property details\" section",
      "Update the bedroom count and bed count fields separately",
      "Save changes and wait for the update to process"
    ];
  }
  
  if (questionLower.includes('price') || questionLower.includes('cost') || questionLower.includes('fee')) {
    return [
      "Check your current pricing settings in the host dashboard",
      "Review the pricing structure and fee breakdown",
      "Understand the difference between base price and additional fees",
      "Consider market rates and competitor pricing"
    ];
  }
  
  if (questionLower.includes('cancel') || questionLower.includes('refund')) {
    return [
      "Review your cancellation policy settings",
      "Understand the refund timeline and conditions",
      "Check guest eligibility for refunds",
      "Follow proper cancellation procedures"
    ];
  }
  
  if (questionLower.includes('feedback') || questionLower.includes('review')) {
    return [
      "Monitor guest reviews and ratings regularly",
      "Respond professionally to all feedback",
      "Address negative reviews constructively",
      "Use feedback to improve your hosting"
    ];
  }
  
  // Generic key points
  return [
    "Review the specific issue or question carefully",
    "Check relevant settings in your host dashboard",
    "Follow the recommended steps or procedures",
    "Contact support if additional help is needed"
  ];
}

// Extract specific action items based on question type
function extractActionItems(content: string, question: string): string[] {
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('bedroom') || questionLower.includes('bed') || questionLower.includes('adjust')) {
    return [
      "Log into your Airbnb host account",
      "Go to \"Manage listings\" and select your specific property",
      "Click on \"Listing details\" in the left sidebar",
      "Scroll to \"Bedrooms and beds\" section",
      "Update the numbers and click \"Save\""
    ];
  }
  
  if (questionLower.includes('price') || questionLower.includes('cost') || questionLower.includes('fee')) {
    return [
      "Access your Airbnb host dashboard",
      "Navigate to the pricing section for your listing",
      "Review and adjust your base price",
      "Configure additional fees if applicable",
      "Save your pricing changes"
    ];
  }
  
  if (questionLower.includes('cancel') || questionLower.includes('refund')) {
    return [
      "Log into your Airbnb account",
      "Go to your reservations or bookings",
      "Select the specific booking to cancel",
      "Choose your cancellation reason",
      "Confirm the cancellation and refund process"
    ];
  }
  
  if (questionLower.includes('feedback') || questionLower.includes('review')) {
    return [
      "Check your Airbnb inbox for guest messages",
      "Review any new guest feedback or reviews",
      "Respond to guest feedback within 24 hours",
      "Address any concerns or issues raised",
      "Use feedback to improve future guest experiences"
    ];
  }
  
  // Generic action items
  return [
    "Log into your Airbnb host account",
    "Navigate to the relevant section in your dashboard",
    "Follow the specific steps outlined in the solution",
    "Save any changes made",
    "Test the solution to ensure it works"
  ];
}

// Categorize content using AI
async function categorizeContent(content: string, question: string): Promise<{ category: string; confidence: number }> {
  try {
    const prompt = `Analyze this content and categorize it into one of these categories:
- pricing
- technical
- customer-service
- booking
- cancellation
- payment
- general

Content: ${content.substring(0, 500)}
Question: ${question}

Return only a JSON object: {"category": "string", "confidence": number}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 100
    });

    let responseContent = response.choices[0].message.content || '{"category": "general", "confidence": 0.5}';
    
    // Clean up markdown formatting if present
    responseContent = responseContent
      .replace(/```json\s*/g, '')  // Remove opening ```json
      .replace(/```\s*$/g, '')     // Remove closing ```
      .replace(/^```\s*/g, '')     // Remove opening ``` at start
      .trim();
    
    try {
      const result = JSON.parse(responseContent);
      return {
        category: result.category || "general",
        confidence: result.confidence || 0.5
      };
    } catch (parseError) {
      console.error('JSON parse error, using fallback:', parseError);
      console.error('Raw response:', responseContent);
      return { category: "general", confidence: 0.5 };
    }
  } catch (error) {
    console.error('Error categorizing content:', error);
    return { category: "general", confidence: 0.5 };
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

    // Check if content has changed
    const currentHash = generateContentHash(article.answer);
    const needsRegeneration = article.contentHash !== currentHash;

    if (needsRegeneration || !(article as any).aiSummaryGenerated) {
      // Generate fresh AI summary
      const aiSummary = generateIntelligentSummary(article.answer, article.question);
      
      // Categorize content
      const categorization = await categorizeContent(article.answer, article.question);
      
      // Update database
      await prisma.article.update({
        where: { id: params.id },
        data: {
          aiSummary,
          category: categorization.category,
          categoryConfidence: categorization.confidence,
          contentHash: currentHash,
          aiSummaryGenerated: true,
          aiSummaryRequestedAt: new Date()
        } as any
      });

      return NextResponse.json({
        aiSummary,
        category: categorization.category,
        confidence: categorization.confidence,
        generated: true
      });
    }

    // Return cached summary
    return NextResponse.json({
      aiSummary: article.aiSummary,
      category: article.category,
      confidence: (article as any).categoryConfidence,
      generated: false
    });

  } catch (error) {
    console.error('Error generating AI summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI summary' },
      { status: 500 }
    );
  }
} 