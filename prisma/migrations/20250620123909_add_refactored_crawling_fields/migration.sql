-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "crawlMode" TEXT NOT NULL DEFAULT 'discovery',
ADD COLUMN     "crawlStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "etag" TEXT,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "lastModified" TEXT;

-- CreateTable
CREATE TABLE "CrawlQueue" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastChecked" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrawlQueue_url_key" ON "CrawlQueue"("url");

-- CreateIndex
CREATE INDEX "CrawlQueue_platform_idx" ON "CrawlQueue"("platform");

-- CreateIndex
CREATE INDEX "CrawlQueue_type_idx" ON "CrawlQueue"("type");

-- CreateIndex
CREATE INDEX "CrawlQueue_status_idx" ON "CrawlQueue"("status");

-- CreateIndex
CREATE INDEX "CrawlQueue_priority_idx" ON "CrawlQueue"("priority");

-- CreateIndex
CREATE INDEX "CrawlQueue_firstSeen_idx" ON "CrawlQueue"("firstSeen");

-- CreateIndex
CREATE INDEX "CrawlQueue_lastChecked_idx" ON "CrawlQueue"("lastChecked");

-- CreateIndex
CREATE INDEX "Article_lastCheckedAt_idx" ON "Article"("lastCheckedAt");

-- CreateIndex
CREATE INDEX "Article_crawlMode_idx" ON "Article"("crawlMode");

-- CreateIndex
CREATE INDEX "Article_crawlStatus_idx" ON "Article"("crawlStatus");
