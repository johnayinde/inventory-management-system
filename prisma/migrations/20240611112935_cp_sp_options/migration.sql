/*
  Warnings:

  - Made the column `cost_price` on table `Inventory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `selling_price` on table `Inventory` required. This step will fail if there are existing NULL values in that column.

*/

-- Update existing rows to set default values for cost_price and selling_price

UPDATE "Inventory" SET "cost_price" = 0 WHERE "cost_price" IS NULL;
UPDATE "Inventory" SET "selling_price" = 0 WHERE "selling_price" IS NULL;
-- AlterTable
ALTER TABLE "Inventory" ALTER COLUMN "cost_price" SET NOT NULL,
ALTER COLUMN "cost_price" SET DEFAULT 0,
ALTER COLUMN "selling_price" SET NOT NULL,
ALTER COLUMN "selling_price" SET DEFAULT 0;

