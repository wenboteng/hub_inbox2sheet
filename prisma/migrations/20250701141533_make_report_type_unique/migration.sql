/*
  Warnings:

  - A unique constraint covering the columns `[type]` on the table `Report` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Report_type_key" ON "Report"("type");
