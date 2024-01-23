/*
  Warnings:

  - You are about to drop the column `tenantId` on the `Tenant` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('PERSONAL', 'PARTNERSHIP');

-- DropForeignKey
ALTER TABLE "Tenant" DROP CONSTRAINT "Tenant_tenantId_fkey";

-- DropIndex
DROP INDEX "Tenant_tenantId_key";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "tenantId";

-- CreateTable
CREATE TABLE "Business" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "business_name" TEXT,
    "business_type" "BusinessType",
    "business_address" TEXT,
    "country" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_tenant_id_key" ON "Business"("tenant_id");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
