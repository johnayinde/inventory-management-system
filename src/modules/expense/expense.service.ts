import { Injectable, NotFoundException } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  EditExpenseDto,
} from './dto/expense.dto';
import { ExpenseType } from '@prisma/client';

@Injectable()
export class ExpenseService {
  constructor(readonly postgresService: OrmService) {}

  async createExpenseCategory(
    tenant_id: number,
    data: CreateExpenseCategoryDto,
  ) {
    return await this.postgresService.expenseCategory.create({
      data: {
        ...data,
        tenant: { connect: { id: tenant_id } },
      },
    });
  }

  async getAllExpenseCategories(tenant_id: number) {
    return await this.postgresService.expenseCategory.findMany({
      where: { tenant_id: tenant_id },
    });
  }

  async createExpense(tenant_id: number, data: CreateExpenseDto) {
    if (data.type == ExpenseType.product && data.productId) {
      const product = await this.postgresService.product.findFirst({
        where: { id: data?.productId, tenant_id },
      });
      if (!product) {
        throw new NotFoundException('Provided product not found');
      }
      const { productId, categoryId, ...expenseData } = data;
      return await this.postgresService.expense.create({
        data: {
          ...expenseData,
          tenant: { connect: { id: tenant_id } },

          product: {
            connect: { id: product.id },
          },
        },
        include: { product: true },
      });
    } else if (data.type == ExpenseType.general && data.categoryId) {
      const category = await this.postgresService.expenseCategory.findUnique({
        where: { id: data.categoryId, tenant_id },
      });

      if (!category) {
        throw new NotFoundException('Expense Category not found');
      }

      const { categoryId, productId, ...expenseData } = data;

      return await this.postgresService.expense.create({
        data: {
          ...expenseData,
          tenant: { connect: { id: tenant_id } },
          category: {
            connect: { id: category.id },
          },
        },
        include: {
          category: true,
        },
      });
    } else {
      throw new NotFoundException('ProductId or CategoryId not found');
    }
  }

  async listExpenses(tenant_id: number) {
    return await this.postgresService.expense.findMany({
      where: { tenant_id },
      include: { category: true, product: true },
    });
  }

  async editExpense(
    tenant_id: number,
    expenseId: number,
    data: EditExpenseDto,
  ) {
    console.log({ expenseId, data });

    const expense = await this.postgresService.expense.findFirst({
      where: { id: Number(expenseId), tenant_id },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    if (expense.type == ExpenseType.product) {
      const { categoryId, ...expenseData } = data;
      return await this.postgresService.expense.update({
        where: { id: Number(expenseId), tenant_id },
        data: {
          ...expenseData,
        },
        include: { category: true, product: true },
      });
    } else if (expense.type == ExpenseType.general) {
      const { productId, ...expenseData } = data;

      return await this.postgresService.expense.update({
        where: { id: Number(expenseId), tenant_id },
        data: {
          ...expenseData,
        },
        include: { category: true, product: true },
      });
    }
  }

  async getExpense(tenant_id: number, expenseId: number) {
    const expense = await this.postgresService.expense.findUnique({
      where: { id: Number(expenseId), tenant_id },
      include: { category: true },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async deleteExpense(tenant_id: number, expenseId: number) {
    const deletedExpense = await this.postgresService.expense.delete({
      where: { id: Number(expenseId), tenant_id },
    });
    if (!deletedExpense) {
      throw new NotFoundException('Expense not found');
    }
  }

  async duplicateExpense(tenant_id: number, expenseId: number) {
    const expenseToDuplicate = await this.postgresService.expense.findUnique({
      where: { id: Number(expenseId), tenant_id },
      include: { category: true, product: true },
    });
    if (!expenseToDuplicate) {
      throw new NotFoundException('Expense not found');
    }

    const {
      id,
      tenant_id: originalTenantId,
      expense_categoryId,
      category,
      productId,
      product,
      inventoryId,

      ...expenseData
    } = expenseToDuplicate;

    if (expenseToDuplicate.type == ExpenseType.product) {
      return await this.postgresService.expense.create({
        data: {
          ...expenseData,
          name: `Copy of ${expenseToDuplicate.name}`,
          tenant: { connect: { id: tenant_id } },
          product: { connect: { id: productId } },
        },
        include: { product: true },
      });
    } else if (expenseToDuplicate.type == ExpenseType.general) {
      return await this.postgresService.expense.create({
        data: {
          ...expenseData,
          name: `Copy of ${expenseToDuplicate.name}`,
          tenant: { connect: { id: tenant_id } },
          category: { connect: { id: expense_categoryId } },
        },
        include: { category: true },
      });
    }
  }
}
