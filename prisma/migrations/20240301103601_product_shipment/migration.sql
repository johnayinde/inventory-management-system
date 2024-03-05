/*
  Warnings:

  - You are about to drop the column `shipmentId` on the `Product` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_shipmentId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "shipmentId",
ALTER COLUMN "status" SET DEFAULT 'sold_out';

-- CreateTable
CREATE TABLE "_ProductToShipment" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProductToShipment_AB_unique" ON "_ProductToShipment"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductToShipment_B_index" ON "_ProductToShipment"("B");

-- AddForeignKey
ALTER TABLE "_ProductToShipment" ADD CONSTRAINT "_ProductToShipment_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToShipment" ADD CONSTRAINT "_ProductToShipment_B_fkey" FOREIGN KEY ("B") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
