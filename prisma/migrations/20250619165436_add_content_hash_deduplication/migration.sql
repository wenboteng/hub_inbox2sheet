/*
  Warnings:

  - A unique constraint covering the columns `[sourceUrl]` on the table `Answer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SubmittedQuestion" ADD COLUMN     "embedding" DOUBLE PRECISION[];

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'official',
    "source" TEXT NOT NULL DEFAULT 'help_center',
    "author" TEXT,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "contentHash" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleParagraph" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" JSONB NOT NULL,

    CONSTRAINT "ArticleParagraph_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_url_key" ON "Article"("url");

-- CreateIndex
CREATE INDEX "Article_platform_idx" ON "Article"("platform");

-- CreateIndex
CREATE INDEX "Article_category_idx" ON "Article"("category");

-- CreateIndex
CREATE INDEX "Article_lastUpdated_idx" ON "Article"("lastUpdated");

-- CreateIndex
CREATE INDEX "Article_contentType_idx" ON "Article"("contentType");

-- CreateIndex
CREATE INDEX "Article_source_idx" ON "Article"("source");

-- CreateIndex
CREATE INDEX "Article_contentHash_idx" ON "Article"("contentHash");

-- CreateIndex
CREATE INDEX "ArticleParagraph_articleId_idx" ON "ArticleParagraph"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_sourceUrl_key" ON "Answer"("sourceUrl");

-- AddForeignKey
ALTER TABLE "ArticleParagraph" ADD CONSTRAINT "ArticleParagraph_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
