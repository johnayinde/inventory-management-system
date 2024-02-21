-- CreateEnum
CREATE TYPE "ValueType" AS ENUM ('fixed', 'percentage');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('all', 'product');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "feesId" INTEGER;

-- CreateTable
CREATE TABLE "Fees" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "value_type" "ValueType" NOT NULL DEFAULT 'fixed',
    "fee_type" "FeeType" NOT NULL DEFAULT 'all',
    "tenant_id" INTEGER NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Fees_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_feesId_fkey" FOREIGN KEY ("feesId") REFERENCES "Fees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fees" ADD CONSTRAINT "Fees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
