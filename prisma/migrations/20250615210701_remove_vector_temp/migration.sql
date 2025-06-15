/*
  Warnings:

  - You are about to drop the column `embedding` on the `Answer` table. All the data in the column will be lost.
  - You are about to drop the column `embedding` on the `SubmittedQuestion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "embedding";

-- AlterTable
ALTER TABLE "SubmittedQuestion" DROP COLUMN "embedding";
