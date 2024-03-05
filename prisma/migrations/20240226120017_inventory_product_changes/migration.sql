/*
  Warnings:

  - You are about to drop the column `inventoryId` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `bulk_price` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `cost_price` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `expected_price` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `shipping_name` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `cost_price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `expected_selling_price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `serial_number` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Product` table. All the data in the column will be lost.
  - Added the required column `product_id` to the `Inventory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_inventoryId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_inventoryId_fkey";

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "inventoryId";

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "bulk_price",
DROP COLUMN "cost_price",
DROP COLUMN "date",
DROP COLUMN "expected_price",
DROP COLUMN "shipping_name",
ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "product_id" INTEGER NOT NULL,
ADD COLUMN     "serial_number" TEXT,
ADD COLUMN     "status" "ProductStatusType" NOT NULL DEFAULT 'in_stock';

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "cost_price",
DROP COLUMN "expected_selling_price",
DROP COLUMN "inventoryId",
DROP COLUMN "note",
DROP COLUMN "quantity",
DROP COLUMN "serial_number",
DROP COLUMN "status";

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
