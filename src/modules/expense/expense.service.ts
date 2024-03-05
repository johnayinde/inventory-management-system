import { Injectable, NotFoundException } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  EditExpenseDto,
} from './dto/expense.dto';
import { ExpenseType, ValueType } from '@prisma/client';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';
import { ExpenseStatsDto, expenseFilters, page_generator } from '@app/common';
import {
  calculatePercentageChange,
  formatDate,
  getLastMonthDateRange,
  mappedData,
} from '@app/common/helpers';

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
      const { productId, categoryId, shipmentId, ...expenseData } = data;
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

      const { categoryId, productId, shipmentId, ...expenseData } = data;

      return await this.postgresService.expense.create({
        data: {
          ...expenseData,
          tenant: { connect: { id: tenant_id } },
          category: {
            connect: category,
          },
        },
        include: {
          category: true,
        },
      });
    } else if (data.type == ExpenseType.shipment) {
      const { categoryId, productId, shipmentId, ...expenseData } = data;

      const shipment = await this.postgresService.shipment.findUnique({
        where: { id: shipmentId, tenant_id },
      });

      if (!shipment) {
        throw new NotFoundException('Shipment ID not valid');
      }

      return await this.postgresService.expense.create({
        data: {
          ...expenseData,
          // shipment: { connect: { id: shipment.id } },
          tenant: { connect: { id: tenant_id } },
        },
      });
    } else {
      throw new NotFoundException('Provided ID not found');
    }
  }

  async listExpenses(tenant_id: number, filters: PaginatorDTO) {
    const { skip, take } = page_generator(
      Number(filters.page),
      Number(filters.pageSize),
    );
    const filter = expenseFilters(filters);
    const whereCondition = filter ? { tenant_id, ...filter } : { tenant_id };

    const all_expenses = await this.postgresService.expense.findMany({
      where: whereCondition,
      include: { category: true, product: true },
      skip,
      take,
    });

    return {
      data: all_expenses,
      totalCount: all_expenses.length,
      pageInfo: {
        currentPage: Number(filters.page),
        perPage: Number(filters.pageSize),
        hasNextPage:
          all_expenses.length > Number(filters.page) * Number(filters.pageSize),
      },
    };
  }

  async editExpense(tenant_id: number, id: number, data: EditExpenseDto) {
    const expense = await this.postgresService.expense.findFirst({
      where: { id, tenant_id },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    if (expense.type == ExpenseType.product) {
      const { categoryId, ...expenseData } = data;
      return await this.postgresService.expense.update({
        where: { id, tenant_id },
        data: {
          ...expenseData,
        },
        include: { category: true, product: true },
      });
    } else if (expense.type == ExpenseType.general) {
      const { productId, ...expenseData } = data;

      return await this.postgresService.expense.update({
        where: { id, tenant_id },
        data: {
          ...expenseData,
        },
        include: { category: true, product: true },
      });
    } else if (expense.type == ExpenseType.shipment) {
      const { productId, categoryId, ...expenseData } = data;

      return await this.postgresService.expense.update({
        where: { id, tenant_id },
        data: {
          ...expenseData,
        },
      });
    }
  }

  async getExpense(tenant_id: number, id: number) {
    const expense = await this.postgresService.expense.findUnique({
      where: { id, tenant_id },
      include: { category: true },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  async deleteExpense(tenant_id: number, id: number) {
    const deletedExpense = await this.postgresService.expense.delete({
      where: { id, tenant_id },
    });
    if (!deletedExpense) {
      throw new NotFoundException('Expense not found');
    }
    return deletedExpense;
  }

  async duplicateExpense(tenant_id: number, expenseId: number) {
    const expenseToDuplicate = await this.postgresService.expense.findUnique({
      where: { id: expenseId, tenant_id },
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
      shipmentId,
      created_at,
      updated_at,

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
    } else if (expenseToDuplicate.type == ExpenseType.shipment) {
      return await this.postgresService.expense.create({
        data: {
          ...expenseData,
          name: `Copy of ${expenseToDuplicate.name}`,
          tenant: { connect: { id: tenant_id } },
        },
        include: { category: true },
      });
    }
  }

  async getExpenseDashboardStats(
    tenant_id: number,
    start_date: Date,
    end_date: Date,
  ) {
    const { endDate, startDate } = formatDate(start_date, end_date);
    const { firstDayOfLastMonth, lastDayOfLastMonth } = getLastMonthDateRange();

    const expenses = await this.postgresService.expense.findMany({
      where: {
        tenant_id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const fees = await this.postgresService.fees.findMany({
      where: {
        tenant_id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    console.log(fees);

    const LastMonthExpenses = await this.postgresService.expense.findMany({
      where: {
        tenant_id,
        created_at: {
          gte: firstDayOfLastMonth,
          lte: lastDayOfLastMonth,
        },
      },
    });

    const stats: ExpenseStatsDto = {
      totalExpenses: 0,
      totalShipping: 0,
      totalFees: 0,
      miscelleneous: 0,

      totalExpensesChange: 0,
      totalShippingChange: 0,
      totalFeesChange: 0,
      miscelleneousChange: 0,
    };

    const lastMonthStats = {
      totalExpenses: 0,
      totalShipping: 0,
      totalFees: 0,
      miscelleneous: 0,
    };

    this.calculateBasicStats(fees, stats, expenses);
    this.calculateBasicStats(fees, lastMonthStats, LastMonthExpenses);
    this.determinePercentages(stats, lastMonthStats);

    return stats;
  }

  async calculateExpenseStats(
    tenant_id: number,
    start_date: Date,
    end_date: Date,
  ) {
    const { endDate, startDate } = formatDate(start_date, end_date);

    const expenses = await this.postgresService.expense.groupBy({
      by: ['created_at'],
      _sum: { amount: true },
      where: {
        tenant_id,
        updated_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const result = mappedData(expenses, '_sum', 'amount');

    return result;
  }

  async topExpenses(tenant_id: number, start_date: Date, end_date: Date) {
    const { endDate, startDate } = formatDate(start_date, end_date);

    const topExpenses = await this.postgresService.expense.findMany({
      where: {
        tenant_id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        type: 'product',
      },
      orderBy: {
        amount: 'desc',
      },
      take: 5,
      include: {
        product: true,
      },
    });

    return topExpenses.map((expense) => ({
      product: expense.product.name,
      amount: expense.amount,
    }));
  }

  private determinePercentages(stats, statsLastMonth) {
    stats.totalExpensesChange =
      calculatePercentageChange(
        stats.totalExpenses,
        statsLastMonth.totalExpenses,
      ) || 0;

    stats.totalShippingChange =
      calculatePercentageChange(
        stats.totalShipping,
        statsLastMonth.totalShipping,
      ) || 0;
    stats.totalFeesChange =
      calculatePercentageChange(stats.totalFees, statsLastMonth.totalFees) || 0;
    stats.miscelleneousChange =
      calculatePercentageChange(
        stats.miscelleneous,
        statsLastMonth.miscelleneous,
      ) || 0;
  }

  private calculateBasicStats(fees, stats, expenses) {
    const totalFees = fees.reduce((sum, fee) => {
      if (fee.value_type == ValueType.fixed) return sum + fee.value;
    }, 0);
    stats.totalFees = totalFees;
    for (const expense of expenses) {
      if (!expense.productId && !ExpenseType.shipment && ExpenseType.general)
        stats.miscelleneous += expense.amount;
      if (ExpenseType.shipment) stats.totalShipping += expense.amount;
      stats.totalExpenses += expense.amount;
    }
  }
}
