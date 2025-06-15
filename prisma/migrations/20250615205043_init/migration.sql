-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "firstAnswerParagraph" TEXT,
    "summary" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "embedding" vector(1536) NOT NULL,
    "dateCollected" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCrawled" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "crawlFrequency" TEXT NOT NULL DEFAULT 'daily',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlJob" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmittedQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "manualAnswer" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "sourceUrl" TEXT,
    "tags" TEXT[],
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "tone" TEXT,

    CONSTRAINT "SubmittedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Answer_platform_idx" ON "Answer"("platform");

-- CreateIndex
CREATE INDEX "Answer_category_idx" ON "Answer"("category");

-- CreateIndex
CREATE INDEX "Answer_tags_idx" ON "Answer"("tags");

-- CreateIndex
CREATE INDEX "Answer_lastCrawled_idx" ON "Answer"("lastCrawled");

-- CreateIndex
CREATE INDEX "SubmittedQuestion_platform_idx" ON "SubmittedQuestion"("platform");

-- CreateIndex
CREATE INDEX "SubmittedQuestion_status_idx" ON "SubmittedQuestion"("status");
