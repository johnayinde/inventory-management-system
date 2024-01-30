-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_expense_categoryId_fkey";

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "productId" INTEGER,
ALTER COLUMN "expense_categoryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_expense_categoryId_fkey" FOREIGN KEY ("expense_categoryId") REFERENCES "expense_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
