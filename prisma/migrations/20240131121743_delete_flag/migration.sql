/*
  Warnings:

  - You are about to drop the column `is_active` on the `Auth` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `Business` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `Inventory` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `Permission` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `Subcategory` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `expense_category` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProductStatusType" AS ENUM ('in_stock', 'running_low', 'sold_out');

-- AlterTable
ALTER TABLE "Auth" DROP COLUMN "is_active",
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Business" DROP COLUMN "is_active",
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "is_active",
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "is_active",
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "is_active",
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "is_active",
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "is_active",
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "ProductStatusType" NOT NULL DEFAULT 'in_stock';

-- AlterTable
ALTER TABLE "Subcategory" DROP COLUMN "is_active",
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "is_active",
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "expense_category" DROP COLUMN "is_active",
ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false;
