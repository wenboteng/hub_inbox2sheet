import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { slugify } from "@/utils/slugify";

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { manualAnswer, status, isPublic } = body;

    let updatedQuestion = await prisma.submittedQuestion.findUnique({ where: { id: params.id }});
    if (!updatedQuestion) {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // If a manual answer is provided, create a public article
    if (manualAnswer) {
      const slug = slugify(updatedQuestion.question);
      // Ensure slug is unique
      let finalSlug = slug;
      let counter = 1;
      while (await prisma.article.findUnique({ where: { slug: finalSlug } })) {
        finalSlug = `${slug}-${counter}`;
        counter++;
      }

      await prisma.article.create({
        data: {
          question: updatedQuestion.question,
          answer: manualAnswer,
          slug: finalSlug,
          platform: updatedQuestion.platform,
          category: "User Submitted",
          url: `/answers/${finalSlug}`, // Use the slug for a relative URL
          contentType: "user_generated",
          isVerified: true, // Admin-submitted answers are considered verified
        },
      });
    }
    
    // Update the original submitted question
    const question = await prisma.submittedQuestion.update({
      where: { id: params.id },
      data: { ...body },
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error("Error updating question:", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.submittedQuestion.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
} 