-- CreateEnum
CREATE TYPE "PricingType" AS ENUM ('bulk', 'individual');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "inventoryId" INTEGER;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "attachments" TEXT[],
ADD COLUMN     "bulk_price" TEXT,
ADD COLUMN     "inventoryId" INTEGER,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "price" TEXT,
ADD COLUMN     "quantity" INTEGER,
ADD COLUMN     "serial_number" INTEGER;

-- CreateTable
CREATE TABLE "Inventory" (
    "id" SERIAL NOT NULL,
    "shipping_name" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "attachments" TEXT[],
    "cost_price" TEXT NOT NULL,
    "expected_price" TEXT NOT NULL,
    "note" TEXT,
    "quantity" INTEGER NOT NULL,
    "pricingType" "PricingType" NOT NULL DEFAULT 'individual',
    "bulk_price" TEXT,
    "tenant_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
