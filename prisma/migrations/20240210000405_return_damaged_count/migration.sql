/*
  Warnings:

  - You are about to drop the column `is_damaged` on the `sales_product` table. All the data in the column will be lost.
  - You are about to drop the column `is_returned` on the `sales_product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sales_product" DROP COLUMN "is_damaged",
DROP COLUMN "is_returned",
ADD COLUMN     "damaged_counts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "returned_counts" INTEGER NOT NULL DEFAULT 0;
