-- CreateIndex
CREATE INDEX "Auth_email_idx" ON "Auth"("email");

-- CreateIndex
CREATE INDEX "Customer_id_tenant_id_idx" ON "Customer"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "Inventory_id_tenant_id_product_id_shipment_id_idx" ON "Inventory"("id", "tenant_id", "product_id", "shipment_id");

-- CreateIndex
CREATE INDEX "Notification_id_tenant_id_idx" ON "Notification"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "Permission_id_idx" ON "Permission"("id");

-- CreateIndex
CREATE INDEX "Product_id_tenant_id_idx" ON "Product"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "Shipment_id_tenant_id_idx" ON "Shipment"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "Tenant_id_email_idx" ON "Tenant"("id", "email");

-- CreateIndex
CREATE INDEX "sales_id_tenant_id_idx" ON "sales"("id", "tenant_id");

-- CreateIndex
CREATE INDEX "sales_product_id_tenant_id_saleId_idx" ON "sales_product"("id", "tenant_id", "saleId");
