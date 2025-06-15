import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { question, platform, email } = await request.json();

    // Validate required fields
    if (!question || !platform) {
      return NextResponse.json(
        { error: "Question and platform are required" },
        { status: 400 }
      );
    }

    // Create submitted question
    const submittedQuestion = await prisma.submittedQuestion.create({
      data: {
        question,
        platform,
        email: email || null,
        status: "pending",
        tags: [],
        isPublic: false,
        aiGenerated: false,
      },
    });

    // Optional: Send email notification
    if (email) {
      // TODO: Implement email notification
      console.log(`Would send email to ${email} about question submission`);
    }

    return NextResponse.json(submittedQuestion);
  } catch (error) {
    console.error("Error submitting question:", error);
    return NextResponse.json(
      { error: "Failed to submit question" },
      { status: 500 }
    );
  }
} 