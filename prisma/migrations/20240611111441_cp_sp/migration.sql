/*
  Warnings:

  - You are about to drop the column `price` on the `Inventory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "price",
ADD COLUMN     "cost_price" DOUBLE PRECISION,
ADD COLUMN     "selling_price" DOUBLE PRECISION;
