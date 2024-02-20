/*
  Warnings:

  - You are about to drop the column `last_login` on the `Auth` table. All the data in the column will be lost.
  - The `amount` column on the `Expense` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Auth" DROP COLUMN "last_login";

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "amount",
ADD COLUMN     "amount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "sales" ALTER COLUMN "expenses" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "total_price" SET DATA TYPE DOUBLE PRECISION;
