/*
  Warnings:

  - You are about to drop the column `quantity_threshold` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Inventory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "quantity_threshold",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "status" "ProductStatusType" NOT NULL DEFAULT 'sold_out',
ADD COLUMN     "threshold" INTEGER NOT NULL DEFAULT 0;
