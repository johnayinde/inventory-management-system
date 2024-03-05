/*
  Warnings:

  - You are about to drop the column `productId` on the `sales_product` table. All the data in the column will be lost.
  - Added the required column `quantity_threshold` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inventory_id` to the `sales_product` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "sales_product" DROP CONSTRAINT "sales_product_productId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "quantity_threshold" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "sales_product" DROP COLUMN "productId",
ADD COLUMN     "inventory_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "sales_product" ADD CONSTRAINT "sales_product_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
