/*
  Warnings:

  - You are about to drop the column `tenant_id` on the `sales_product` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "sales_product" DROP CONSTRAINT "sales_product_tenant_id_fkey";

-- AlterTable
ALTER TABLE "sales_product" DROP COLUMN "tenant_id";
