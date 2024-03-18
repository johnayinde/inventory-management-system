-- CreateEnum
CREATE TYPE "NotifierType" AS ENUM ('low_stock', 'sold_out', 'top_selling');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "low_stock_notifier" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sold_out_notifier" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "top_selling_notifier" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "type" "NotifierType" NOT NULL DEFAULT 'low_stock',
    "tenant_id" INTEGER NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_InventoryToNotification" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_InventoryToNotification_AB_unique" ON "_InventoryToNotification"("A", "B");

-- CreateIndex
CREATE INDEX "_InventoryToNotification_B_index" ON "_InventoryToNotification"("B");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InventoryToNotification" ADD CONSTRAINT "_InventoryToNotification_A_fkey" FOREIGN KEY ("A") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InventoryToNotification" ADD CONSTRAINT "_InventoryToNotification_B_fkey" FOREIGN KEY ("B") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
