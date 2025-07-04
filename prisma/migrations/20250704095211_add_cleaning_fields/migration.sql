/*
  Warnings:

  - A unique constraint covering the columns `[originalId]` on the table `ImportedGYGActivity` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ImportedGYGActivity" ADD COLUMN     "city" TEXT,
ADD COLUMN     "cleanedAt" TIMESTAMP(3),
ADD COLUMN     "country" TEXT,
ADD COLUMN     "durationDays" INTEGER,
ADD COLUMN     "durationHours" INTEGER,
ADD COLUMN     "priceCurrency" TEXT,
ADD COLUMN     "qualityScore" INTEGER,
ADD COLUMN     "venue" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ImportedGYGActivity_originalId_key" ON "ImportedGYGActivity"("originalId");

-- CreateIndex
CREATE INDEX "ImportedGYGActivity_cleanedAt_idx" ON "ImportedGYGActivity"("cleanedAt");

-- CreateIndex
CREATE INDEX "ImportedGYGActivity_qualityScore_idx" ON "ImportedGYGActivity"("qualityScore");

-- CreateIndex
CREATE INDEX "ImportedGYGActivity_city_idx" ON "ImportedGYGActivity"("city");

-- CreateIndex
CREATE INDEX "ImportedGYGActivity_country_idx" ON "ImportedGYGActivity"("country");
