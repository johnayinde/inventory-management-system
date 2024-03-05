/*
  Warnings:

  - You are about to drop the column `quantity` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `quantity_threshold` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "quantity" INTEGER DEFAULT 0,
ADD COLUMN     "quantity_threshold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "ProductStatusType" NOT NULL DEFAULT 'sold_out';

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "quantity",
DROP COLUMN "quantity_threshold",
DROP COLUMN "status";
