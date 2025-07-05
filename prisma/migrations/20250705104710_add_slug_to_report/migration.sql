/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Report` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Report` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "slug" TEXT;

-- Set slug for existing rows using type
UPDATE "Report" SET "slug" = "type" WHERE "slug" IS NULL;

-- Make slug NOT NULL
ALTER TABLE "Report" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Report_slug_key" ON "Report"("slug");
