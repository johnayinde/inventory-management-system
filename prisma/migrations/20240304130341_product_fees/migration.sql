/*
  Warnings:

  - You are about to drop the column `feesId` on the `Product` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_feesId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "feesId";

-- CreateTable
CREATE TABLE "_FeesToProduct" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_FeesToProduct_AB_unique" ON "_FeesToProduct"("A", "B");

-- CreateIndex
CREATE INDEX "_FeesToProduct_B_index" ON "_FeesToProduct"("B");

-- AddForeignKey
ALTER TABLE "_FeesToProduct" ADD CONSTRAINT "_FeesToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Fees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FeesToProduct" ADD CONSTRAINT "_FeesToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
