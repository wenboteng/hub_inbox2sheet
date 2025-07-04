-- CreateTable
CREATE TABLE "ImportedGYGActivity" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "activityName" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "priceText" TEXT,
    "priceNumeric" DOUBLE PRECISION,
    "ratingText" TEXT,
    "ratingNumeric" DOUBLE PRECISION,
    "reviewCountText" TEXT,
    "reviewCountNumeric" INTEGER,
    "duration" TEXT,
    "description" TEXT,
    "extractionQuality" TEXT,
    "tags" TEXT[],
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportedGYGActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportedGYGActivity_providerName_idx" ON "ImportedGYGActivity"("providerName");

-- CreateIndex
CREATE INDEX "ImportedGYGActivity_location_idx" ON "ImportedGYGActivity"("location");

-- CreateIndex
CREATE INDEX "ImportedGYGActivity_ratingNumeric_idx" ON "ImportedGYGActivity"("ratingNumeric");

-- CreateIndex
CREATE INDEX "ImportedGYGActivity_priceNumeric_idx" ON "ImportedGYGActivity"("priceNumeric");

-- CreateIndex
CREATE INDEX "ImportedGYGActivity_extractionQuality_idx" ON "ImportedGYGActivity"("extractionQuality");

-- CreateIndex
CREATE INDEX "ImportedGYGActivity_importedAt_idx" ON "ImportedGYGActivity"("importedAt");
