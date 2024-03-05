/*
  Warnings:

  - You are about to drop the column `status` on the `Inventory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "quantity" INTEGER,
ADD COLUMN     "status" "ProductStatusType" NOT NULL DEFAULT 'in_stock';
