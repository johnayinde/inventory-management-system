/*
  Warnings:

  - You are about to drop the column `pricingType` on the `Inventory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "pricingType",
ADD COLUMN     "pricing_type" "PricingType" NOT NULL DEFAULT 'individual';

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "serial_number" SET DATA TYPE TEXT;
