/*
  Warnings:

  - Added the required column `prod_id` to the `Inventory` table without a default value. This is not possible if the table is not empty.
  - Made the column `date` on table `Shipment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "prod_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "reference" TEXT,
ALTER COLUMN "date" SET NOT NULL;
