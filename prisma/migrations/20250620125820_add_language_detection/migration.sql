-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- CreateIndex
CREATE INDEX "Article_language_idx" ON "Article"("language");
