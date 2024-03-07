/*
  Warnings:

  - You are about to drop the column `attachment` on the `Expense` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "attachment",
ADD COLUMN     "attachments" TEXT[];
