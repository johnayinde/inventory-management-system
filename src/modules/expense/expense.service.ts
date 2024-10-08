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
  calculateChangeInPercentage,
  ImageUploadService,
} from '@app/common/helpers';
import {
  aggregateByTimestamp,
  getTimeRanges,
} from '@app/common/helpers/date-ranges';

@Injectable()
export class ExpenseService {
  constructor(
    readonly postgresService: OrmService,
    readonly imageUploadService: ImageUploadService,
  ) {}

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
      where: { tenant_id },
    });
  }

  async createExpense(
    tenant_id: number,
    data: CreateExpenseDto,
    files: Array<Express.Multer.File>,
  ) {
    let image_urls: string[] = [];

    if (files && files.length > 0) {
      image_urls = await this.imageUploadService.uploadImages(files);
    }

    const { type, productId, categoryId, shipmentId, amount, ...expenseData } =
      data;

    if (type == ExpenseType.product && productId) {
      const inventory_product = await this.postgresService.inventory.findFirst({
        where: { id: Number(productId), tenant_id },
      });
      if (!inventory_product) {
        throw new NotFoundException('Provided item not found in inventory');
      }

      const created_expense = await this.postgresService.expense.create({
        data: {
          ...expenseData,
          amount: Number(amount),
          tenant: { connect: { id: tenant_id } },
          attachments: image_urls,
          inventory: {
            connect: { id: inventory_product.id },
          },
        },
      });

      await this.postgresService.inventory.update({
        where: { id: Number(productId), tenant_id },
        data: { cost_price: { increment: Number(amount) } },
      });
      return created_expense;
    } else if (type == ExpenseType.general && categoryId) {
      const category = await this.postgresService.expenseCategory.findUnique({
        where: { id: Number(categoryId), tenant_id },
      });

      if (!category) {
        throw new NotFoundException('Expense Category not found');
      }

      return await this.postgresService.expense.create({
        data: {
          ...expenseData,
          amount: Number(amount),
          attachments: image_urls,
          tenant: { connect: { id: tenant_id } },
          category: {
            connect: category,
          },
        },
      });
    } else if (type == ExpenseType.shipment) {
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
      include: { category: true },
      skip,
      take,
      orderBy: { created_at: 'desc' },
    });

    const totalCount = await this.postgresService.expense.count({
      where: { tenant_id },
    });

    return {
      data: all_expenses,
      totalCount,
      pageInfo: {
        currentPage: Number(filters.page),
        perPage: Number(filters.pageSize),
        hasNextPage:
          all_expenses.length > Number(filters.page) * Number(filters.pageSize),
      },
    };
  }

  async editExpense(
    tenant_id: number,
    id: number,
    files: Array<Express.Multer.File>,
    data: EditExpenseDto,
  ) {
    const expense = await this.postgresService.expense.findFirst({
      where: { id, tenant_id },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    let image_urls = expense.attachments;
    if (files && files.length > 0) {
      image_urls = await this.imageUploadService.uploadImages(files);
    }

    if (expense.type == ExpenseType.product) {
      const { categoryId, ...expenseData } = data;
      return await this.postgresService.expense.update({
        where: { id, tenant_id },
        data: {
          ...expenseData,
          attachments: image_urls,
        },
      });
    } else if (expense.type == ExpenseType.general) {
      const { productId, categoryId, amount, ...expenseData } = data;

      const original_amount = expense.amount;
      const new_amount = Number(amount);

      await this.postgresService.expense.update({
        where: { id, tenant_id },
        data: {
          ...expenseData,
          amount: new_amount,
          category_id: Number(categoryId),
          attachments: image_urls,
        },
      });

      const difference = new_amount - original_amount;
      await this.postgresService.inventory.update({
        where: { id: Number(expense.inventory_id), tenant_id },
        data: { cost_price: { increment: difference } },
      });

      return await this.postgresService.expense.findFirst({
        where: { id, tenant_id },
      });
    } else if (expense.type == ExpenseType.shipment) {
      const { productId, categoryId, ...expenseData } = data;

      return await this.postgresService.expense.update({
        where: { id, tenant_id },
        data: {
          ...expenseData,
          attachments: image_urls,
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

  async deleteFile(id: number, imageId: string, tenant_id: number) {
    const expense = await this.postgresService.expense.findUnique({
      where: { id, tenant_id },
    });

    if (!expense) {
      throw new NotFoundException(`Expense not found`);
    }

    const imageToDelete = expense.attachments.find(
      (image) => image === imageId,
    );

    if (!imageToDelete) {
      throw new NotFoundException(`Image not found for the resource`);
    }
    const folder = process.env.AWS_S3_FOLDER;

    await this.imageUploadService.deleteImage(imageToDelete);
    await this.postgresService.expense.update({
      where: { id, tenant_id },
      data: {
        attachments: {
          set: expense.attachments.filter((s) => s != imageToDelete),
        },
      },
    });
  }

  async duplicateExpense(tenant_id: number, expenseId: number) {
    const expenseToDuplicate = await this.postgresService.expense.findUnique({
      where: { id: expenseId, tenant_id },
      include: { category: true, inventory: true },
    });
    if (!expenseToDuplicate) {
      throw new NotFoundException('Expense not found');
    }

    const {
      id,
      tenant_id: originalTenantId,
      category_id,
      category,
      inventory_id,
      inventory,
      shipmentId,
      created_at,
      updated_at,
      sale_product_id,

      ...expenseData
    } = expenseToDuplicate;

    if (expenseToDuplicate.type == ExpenseType.product) {
      return await this.postgresService.expense.create({
        data: {
          ...expenseData,
          name: `Copy of ${expenseToDuplicate.name}`,
          tenant: { connect: { id: tenant_id } },
          inventory: { connect: { id: inventory_id } },
        },
      });
    } else if (expenseToDuplicate.type == ExpenseType.general) {
      return await this.postgresService.expense.create({
        data: {
          ...expenseData,
          name: `Copy of ${expenseToDuplicate.name}`,
          tenant: { connect: { id: tenant_id } },
          category: { connect: { id: category_id } },
        },
      });
    } else if (expenseToDuplicate.type == ExpenseType.shipment) {
      return await this.postgresService.expense.create({
        data: {
          ...expenseData,
          name: `Copy of ${expenseToDuplicate.name}`,
          tenant: { connect: { id: tenant_id } },
        },
      });
    }
  }

  async getExpenseDashboardStats(
    tenant_id: number,
    time_period: 'day' | 'week' | 'month' | 'year',
  ) {
    const { current, previous } = getTimeRanges(time_period);

    const dateCondition = {
      created_at: {
        gte: current.start,
        lte: current.end,
      },
    };

    const previousDateCondition = {
      created_at: {
        gte: previous.start,
        lte: previous.end,
      },
    };
    const expenses = await this.postgresService.expense.findMany({
      where: {
        tenant_id,
        ...dateCondition,
      },
      select: { amount: true, type: true },
    });

    const fees = await this.postgresService.fees.findMany({
      where: {
        tenant_id,
        value_type: 'fixed',
        ...dateCondition,
      },
      select: { value: true },
    });

    const feesPreviousMonth = await this.postgresService.fees.findMany({
      where: {
        tenant_id,
        value_type: 'fixed',
        ...previousDateCondition,
      },
      select: { value: true },
    });

    const LastMonthExpenses = await this.postgresService.expense.findMany({
      where: {
        tenant_id,
        ...previousDateCondition,
      },
      select: { amount: true, type: true },
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

    this.calculateBasicStats(stats, fees, expenses);

    this.calculateBasicStats(
      lastMonthStats,
      feesPreviousMonth,
      LastMonthExpenses,
    );

    this.determinePercentages(stats, lastMonthStats);

    return stats;
  }

  async calculateExpenseStats(
    tenant_id: number,
    time_period: 'day' | 'week' | 'month' | 'year',
  ) {
    const { current, labels } = getTimeRanges(time_period);

    const dateCondition = {
      created_at: {
        gte: current.start,
        lte: current.end,
      },
    };

    const expenses = await this.postgresService.expense.findMany({
      select: {
        created_at: true,
        amount: true,
      },
      where: {
        tenant_id,
        ...dateCondition,
      },
    });
    const prepared_data = aggregateByTimestamp(expenses, time_period, labels);

    return prepared_data;
  }

  async topExpenses(
    tenant_id: number,
    time_period: 'day' | 'week' | 'month' | 'year',
  ) {
    const { current } = getTimeRanges(time_period);

    const dateCondition = {
      created_at: {
        gte: current.start,
        lte: current.end,
      },
    };

    const topExpenses = await this.postgresService.expense.findMany({
      where: {
        tenant_id,
        ...dateCondition,
      },
      orderBy: {
        amount: 'desc',
      },
      take: 5,
    });

    return topExpenses.map((expense) => ({
      name: expense.name,
      amount: expense.amount,
    }));
  }

  private determinePercentages(stats, statsLastMonth) {
    stats.totalExpensesChange = calculateChangeInPercentage(
      stats.totalExpenses,
      statsLastMonth.totalExpenses,
    );

    stats.totalShippingChange = calculateChangeInPercentage(
      stats.totalShipping,
      statsLastMonth.totalShipping,
    );
    stats.totalFeesChange =
      calculateChangeInPercentage(stats.totalFees, statsLastMonth.totalFees) ||
      0;
    stats.miscelleneousChange = calculateChangeInPercentage(
      stats.miscelleneous,
      statsLastMonth.miscelleneous,
    );
  }

  private calculateBasicStats(stats, fees, expenses) {
    stats.totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    stats.totalShipping = expenses.reduce((sum, expense) => {
      if (expense.type === ExpenseType.shipment) {
        return sum + expense.amount;
      }
      return sum;
    }, 0);

    stats.miscelleneous = expenses.reduce((sum, expense) => {
      if (expense.type === ExpenseType.miscellaneous) {
        return sum + expense.amount;
      }
      return sum;
    }, 0);

    stats.totalFees = fees.reduce((sum, fee) => sum + fee.value, 0);
  }
}
