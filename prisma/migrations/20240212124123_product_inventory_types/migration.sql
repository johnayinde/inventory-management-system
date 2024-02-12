/*
  Warnings:

  - The `cost_price` column on the `Inventory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `expected_price` column on the `Inventory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `bulk_price` column on the `Inventory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `bulk_price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - Made the column `tenant_id` on table `sales_product` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "sales_product" DROP CONSTRAINT "sales_product_tenant_id_fkey";

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "cost_price",
ADD COLUMN     "cost_price" DOUBLE PRECISION,
DROP COLUMN "expected_price",
ADD COLUMN     "expected_price" DOUBLE PRECISION,
DROP COLUMN "bulk_price",
ADD COLUMN     "bulk_price" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "bulk_price",
DROP COLUMN "price",
ADD COLUMN     "cost_price" DOUBLE PRECISION,
ADD COLUMN     "expected_selling_price" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "sales_product" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "sales_product" ADD CONSTRAINT "sales_product_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
