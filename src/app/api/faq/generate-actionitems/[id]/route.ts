import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    const crypto = require('crypto');
    const currentHash = crypto.createHash('md5').update(article.answer).digest('hex');
    const needsRegeneration = article.contentHash !== currentHash;

    if (needsRegeneration || !article.actionItemsGenerated) {
      // Generate fresh action items
      const actionItems = extractActionItems(article.answer, article.question);
      
      // Update database
      await prisma.article.update({
        where: { id: params.id },
        data: {
          actionItems,
          actionItemsGenerated: true,
          actionItemsRequestedAt: new Date()
        } as any
      });

      return NextResponse.json({
        actionItems,
        generated: true
      });
    }

    // Return cached action items
    return NextResponse.json({
      actionItems: article.actionItems,
      generated: false
    });

  } catch (error) {
    console.error('Error generating action items:', error);
    return NextResponse.json(
      { error: 'Failed to generate action items' },
      { status: 500 }
    );
  }
} 