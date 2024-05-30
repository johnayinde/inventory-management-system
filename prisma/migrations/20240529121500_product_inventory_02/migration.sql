-- DropIndex
DROP INDEX "Product_id_tenant_id_idx";

-- DropIndex
DROP INDEX "sales_product_id_tenant_id_saleId_idx";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "prices" TEXT;

-- CreateIndex
CREATE INDEX "Product_id_tenant_id_status_threshold_prices_idx" ON "Product"("id", "tenant_id", "status", "threshold", "prices");

-- CreateIndex
CREATE INDEX "sales_product_id_tenant_id_saleId_inventory_id_idx" ON "sales_product"("id", "tenant_id", "saleId", "inventory_id");
