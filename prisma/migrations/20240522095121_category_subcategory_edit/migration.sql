-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_sub_category_id_fkey";

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "sub_category_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
