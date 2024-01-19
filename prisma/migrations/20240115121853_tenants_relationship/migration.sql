/*
  Warnings:

  - You are about to drop the column `tenant_id` on the `Tenant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenantId]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `Tenant` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Tenant_tenant_id_key";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "tenant_id",
ADD COLUMN     "tenantId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_tenantId_key" ON "Tenant"("tenantId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Auth"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
