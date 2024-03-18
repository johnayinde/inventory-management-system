/*
  Warnings:

  - You are about to drop the `_InventoryToNotification` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `products` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_InventoryToNotification" DROP CONSTRAINT "_InventoryToNotification_A_fkey";

-- DropForeignKey
ALTER TABLE "_InventoryToNotification" DROP CONSTRAINT "_InventoryToNotification_B_fkey";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "products" JSONB NOT NULL;

-- DropTable
DROP TABLE "_InventoryToNotification";
