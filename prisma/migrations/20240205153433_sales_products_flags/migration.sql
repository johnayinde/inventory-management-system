-- AlterTable
ALTER TABLE "sales_product" ADD COLUMN     "is_damaged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_returned" BOOLEAN NOT NULL DEFAULT false;
