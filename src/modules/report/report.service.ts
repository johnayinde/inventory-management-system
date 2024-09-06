import { Injectable } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { ReportDashboardStatsDto } from './dto/report.dto';
import { calculateChangeInPercentage } from '@app/common/helpers';
import { LossMarginData, ProfitMarginData } from '../dashboard/interface';
import {
  aggregateByTimestamp,
  getTimeRanges,
} from '@app/common/helpers/date-ranges';

@Injectable()
export class ReportService {
  constructor(private readonly prismaService: OrmService) {}

  async getDashboardStats(
    tenant_id: number,
    time_period: 'day' | 'week' | 'month' | 'year',
  ): Promise<ReportDashboardStatsDto> {
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

    const sales = await this.prismaService.sale.findMany({
      where: {
        tenant_id,
        ...dateCondition,
      },
      include: {
        sales_products: true,
      },
    });

    const sales_prev = await this.prismaService.sale.findMany({
      where: {
        tenant_id,
        ...previousDateCondition,
      },
      include: {
        sales_products: true,
      },
    });

    const expenses = await this.prismaService.expense.findMany({
      where: {
        tenant_id,
        ...dateCondition,
      },
    });

    const expenses_prev = await this.prismaService.expense.findMany({
      where: {
        tenant_id,
        ...previousDateCondition,
      },
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_price, 0);
    const totalRevenue_prev = sales_prev.reduce(
      (sum, sale) => sum + sale.total_price,
      0,
    );

    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    const totalExpenses_prev = expenses_prev.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    const netProfit = totalRevenue - totalExpenses;
    const netProfit_prev = totalRevenue_prev - totalExpenses_prev;

    const totalLosses = expenses.reduce((sum, expense) => {
      return expense.amount < 0 ? sum + Math.abs(expense.amount) : sum;
    }, 0);

    const totalLosses_prev = expenses_prev.reduce((sum, expense) => {
      return expense.amount < 0 ? sum + Math.abs(expense.amount) : sum;
    }, 0);

    const stats = {
      totalRevenue,
      netProfit,
      totalExpenses,
      totalLosses,
      totalRevenueChange: calculateChangeInPercentage(
        totalRevenue,
        totalRevenue_prev,
      ),
      netProfitChange: calculateChangeInPercentage(netProfit, netProfit_prev),
      totalExpensesChange: calculateChangeInPercentage(
        totalExpenses,
        totalExpenses_prev,
      ),
      totalLossesChange: calculateChangeInPercentage(
        totalLosses,
        totalLosses_prev,
      ),
    };
    return stats;
  }

  async getCustomerStats(
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

    const customers = await this.prismaService.customer.findMany({
      select: {
        created_at: true,
      },
      where: {
        tenant_id,
        ...dateCondition,
      },
    });

    const prepared_data = aggregateByTimestamp(customers, time_period, labels);

    return prepared_data;
  }

  async valueAddedTax(
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

    const fee = await this.prismaService.fees.findMany({
      select: {
        created_at: true,
        value: true,
      },
      where: {
        tenant_id,
        ...dateCondition,
      },
    });

    const prepared_data = aggregateByTimestamp(fee, time_period, labels);

    return prepared_data;
  }

  async topProductInventory(
    tenant_id: number,
    time_period: 'day' | 'week' | 'month' | 'year',
    limit: number = 5,
  ) {
    const { current } = getTimeRanges(time_period);

    const dateCondition = {
      created_at: {
        gte: current.start,
        lte: current.end,
      },
    };

    const allSaleProducts = await this.prismaService.saleProduct.findMany({
      where: {
        tenant_id,
        ...dateCondition,
      },
      include: { inventory_item: { include: { product: true } } },
      orderBy: { quantity: 'desc' },
      take: limit,
    });

    const topSellingProducts = await Promise.all(
      allSaleProducts.map(async (saleProduct) => {
        const product = await this.prismaService.inventory.findFirst({
          where: { tenant_id, id: saleProduct.inventory_item.id },
        });

        return {
          product: saleProduct.inventory_item.product.name,
          purchased_quantity: saleProduct.quantity,
          remaining_quantity: product?.quantity || 0,
        };
      }),
    );

    return topSellingProducts;
  }

  async calculateProfitMargin(
    tenant_id: number,
    time_period: 'day' | 'week' | 'month' | 'year',
  ): Promise<ProfitMarginData[]> {
    const { current, labels } = getTimeRanges(time_period);

    const dateCondition = {
      created_at: {
        gte: current.start,
        lte: current.end,
      },
    };

    const sales = await this.prismaService.sale.findMany({
      where: {
        tenant_id,
        ...dateCondition,
      },
      include: {
        sales_products: true,
      },
    });

    const profitMarginStats: { created_at: Date; amount: number }[] = [];

    for (const sale of sales) {
      const totalRevenue = sale.total_price;
      const totalExpenses = sale.expenses;
      const totalCOGS = sale.sales_products.reduce(
        (sum, saleProduct) => sum + saleProduct.expense,
        0,
      );

      const profit = totalRevenue - totalCOGS - totalExpenses;
      const profitMargin =
        totalRevenue !== 0 ? (profit / totalRevenue) * 100 : 0;

      profitMarginStats.push({
        created_at: sale.created_at,
        amount: profitMargin,
      });
    }

    const prepared_data = aggregateByTimestamp(
      profitMarginStats,
      time_period,
      labels,
    );
    return prepared_data;
  }

  async calculateLossMargin(
    tenant_id: number,
    time_period: 'day' | 'week' | 'month' | 'year',
  ): Promise<LossMarginData[]> {
    const { current, labels } = getTimeRanges(time_period);

    const dateCondition = {
      created_at: {
        gte: current.start,
        lte: current.end,
      },
    };

    const sales = await this.prismaService.sale.findMany({
      where: {
        tenant_id,
        ...dateCondition,
      },
      include: {
        sales_products: true,
      },
    });

    const lossMarginStats: { created_at: Date; amount: number }[] = [];

    for (const sale of sales) {
      const totalRevenue = sale.total_price;
      const totalExpenses = sale.expenses;

      const loss = totalExpenses - totalRevenue;

      const lossMargin = totalExpenses !== 0 ? (loss / totalExpenses) * 100 : 0;

      lossMarginStats.push({
        created_at: sale.created_at,
        amount: lossMargin,
      });
    }

    const prepared_data = aggregateByTimestamp(
      lossMarginStats,
      time_period,
      labels,
    );

    return prepared_data;
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

    const expenses = await this.prismaService.expense.findMany({
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

  async CustomerSalesStats(
    tenant_id: number,
    time_period: 'day' | 'week' | 'month' | 'year',
    limit: number = 5,
  ) {
    const { current } = getTimeRanges(time_period);

    const dateCondition = {
      created_at: {
        gte: current.start,
        lte: current.end,
      },
    };

    const customersWithSales = await this.prismaService.customer.findMany({
      where: {
        tenant_id,
      },
      include: {
        sales: {
          where: {
            ...dateCondition,
          },
        },
      },
    });

    const customerAnalytics = customersWithSales
      .map((customer) => ({
        customer: customer.name,
        amount: customer.sales.reduce((sum, sale) => sum + sale.total_price, 0),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);

    return customerAnalytics;
  }

  async totalRevenue(
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

    const sales = await this.prismaService.sale.findMany({
      where: {
        tenant_id,
        ...dateCondition,
      },
      include: {
        sales_products: true,
      },
    });

    const revenueStats: { created_at: Date; amount: number }[] = [];

    for (const sale of sales) {
      const totalRevenue = sale.total_price;

      revenueStats.push({
        created_at: sale.created_at,
        amount: totalRevenue,
      });
    }

    const prepared_data = aggregateByTimestamp(
      revenueStats,
      time_period,
      labels,
    );

    return prepared_data;
  }
}
