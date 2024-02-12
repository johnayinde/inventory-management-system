-- AlterTable
ALTER TABLE "sales_product" ADD COLUMN     "tenant_id" INTEGER;

-- AddForeignKey
ALTER TABLE "sales_product" ADD CONSTRAINT "sales_product_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
