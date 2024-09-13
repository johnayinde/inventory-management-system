import { Injectable } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { ReportDashboardStatsDto } from './dto/report.dto';
import { calculateChangeInPercentage } from '@app/common/helpers';
import { LossMarginData, ProfitMarginData } from '../dashboard/interface';
import {
  aggregateByTimestamp,
  getTimeRanges,
} from '@app/common/helpers/date-ranges';
import { DashboardService } from '../dashboard/dashboard.service';

@Injectable()
export class ReportService {
  constructor(
    private readonly prismaService: OrmService,
    private dashBoardService: DashboardService,
  ) {}

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

    const {
      total_losses,
      total_losses_prev,
      total_revenue,
      total_revenue_prev,
      total_expenses,
      total_expenses_prev,
      net_profit,
      net_profit_prev,
    } = await this.dashBoardService.calculateMetrics(
      tenant_id,
      previousDateCondition,
      dateCondition,
    );

    const stats = {
      totalRevenue: total_revenue,
      netProfit: net_profit,
      totalExpenses: total_expenses,
      totalLosses: total_losses,
      totalRevenueChange: calculateChangeInPercentage(
        total_revenue,
        total_revenue_prev,
      ),
      netProfitChange: calculateChangeInPercentage(net_profit, net_profit_prev),
      totalExpensesChange: calculateChangeInPercentage(
        total_expenses,
        total_expenses_prev,
      ),
      totalLossesChange: calculateChangeInPercentage(
        total_losses,
        total_losses_prev,
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
        value_type: 'fixed',
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
      orderBy: { quantity: 'desc' },
      take: limit,
    });

    const inventoryIdsArray = [
      ...new Set(allSaleProducts.map(({ inventory_id }) => inventory_id)),
    ];

    const topSellingProducts = await Promise.all(
      inventoryIdsArray.map(async (inventory_id) => {
        const data = allSaleProducts.filter(
          (item) => item.inventory_id === inventory_id,
        );

        const product = await this.prismaService.inventory.findFirst({
          where: { tenant_id, id: inventory_id },
        });

        const quantity = data.reduce((acc, item) => acc + item.quantity, 0);

        return {
          product: product.name,
          purchased_quantity: quantity,
          remaining_quantity: product.quantity,
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

    const { profit_margin } = await this.dashBoardService.calculateMetrics(
      tenant_id,
      dateCondition,
    );

    const prepared_data = aggregateByTimestamp(
      profit_margin,
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

    const { loss_margin } = await this.dashBoardService.calculateMetrics(
      tenant_id,
      dateCondition,
    );

    const prepared_data = aggregateByTimestamp(
      loss_margin,
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
