import { Injectable } from '@nestjs/common';
import {
  AnalyticsResult,
  ProfitMarginData,
  TopSellingProduct,
} from './interface';
import { OrmService } from 'src/database/orm.service';
import { calculateChangeInPercentage } from '@app/common/helpers';
import {
  aggregateByTimestamp,
  getTimeRanges,
} from '@app/common/helpers/date-ranges';

@Injectable()
export class DashboardService {
  constructor(private readonly postgresService: OrmService) {}

  async calculateAnalytics(
    tenant_id: number,
    time_period: 'day' | 'week' | 'month' | 'year',
  ): Promise<AnalyticsResult> {
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

    const totalSales = await this.postgresService.sale.count({
      where: {
        tenant_id,
        ...dateCondition,
      },
    });

    const {
      total_profit,
      total_profit_prev,
      total_revenue,
      total_revenue_prev,
    } = await this.calculateMetrics(
      tenant_id,
      previousDateCondition,
      dateCondition,
    );

    const totalInventory = await this.postgresService.inventory.count({
      where: {
        tenant_id,
        ...dateCondition,
      },
    });

    const previousTotalSales = await this.postgresService.sale.count({
      where: {
        tenant_id,
        ...previousDateCondition,
      },
    });

    const previousTotalInventory = await this.postgresService.inventory.count({
      where: {
        tenant_id,
        ...previousDateCondition,
      },
    });

    const salesChangePercentage = calculateChangeInPercentage(
      totalSales,
      previousTotalSales,
    );

    const revenueChangePercentage = calculateChangeInPercentage(
      total_revenue,
      total_revenue_prev,
    );

    const profitChangePercentage = calculateChangeInPercentage(
      total_profit,
      total_profit_prev,
    );
    const inventoryChangePercentage = calculateChangeInPercentage(
      totalInventory,
      previousTotalInventory,
    );

    return {
      totalSales,
      totalRevenue: total_revenue || 0,
      totalProfit: total_profit || 0,
      totalInventory,
      salesChangePercentage,
      revenueChangePercentage,
      profitChangePercentage,
      inventoryChangePercentage,
    };
  }

  async calculateMetrics(
    tenant_id: number,
    previousDateCondition?: { created_at: { gte: any; lte: any } },
    dateCondition?: { created_at: { gte: any; lte: any } },
  ) {
    const saleProduct_prev = await this.postgresService.saleProduct.findMany({
      where: {
        tenant_id,
        ...previousDateCondition,
      },
      include: { inventory_item: true },
    });

    const saleProduct = await this.postgresService.saleProduct.findMany({
      where: {
        tenant_id,
        ...dateCondition,
      },
      include: { inventory_item: true },
    });

    const expenses = await this.postgresService.expense.findMany({
      where: {
        tenant_id,
        ...dateCondition,
      },
      select: { amount: true, type: true },
    });

    const expenses_prev = await this.postgresService.expense.findMany({
      where: {
        tenant_id,
        ...previousDateCondition,
      },
      select: { amount: true, type: true },
    });
    const total_revenue = saleProduct.reduce(
      (sac, item) => sac + item.total_price,
      0,
    );

    const total_revenue_prev = saleProduct_prev.reduce(
      (sac, item) => sac + item.total_price,
      0,
    );

    const total_expenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    const total_expenses_prev = expenses_prev.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    const cost_price = saleProduct.reduce(
      (sac, item) => sac + (item.inventory_item?.cost_price || 0),
      0,
    );
    const cost_price_prev = saleProduct_prev.reduce(
      (sac, item) => sac + (item.inventory_item?.cost_price || 0),
      0,
    );
    const total_profit = total_revenue - cost_price;
    const total_profit_prev = total_revenue_prev - cost_price_prev;

    const net_profit = total_revenue - total_expenses;
    const net_profit_prev = total_revenue_prev - total_expenses_prev;

    const total_losses =
      total_expenses > total_revenue ? total_expenses - total_revenue : 0;

    const total_losses_prev =
      total_expenses_prev > total_revenue_prev
        ? total_expenses_prev - total_revenue_prev
        : 0;

    const profit_margin = saleProduct.map((item) => {
      const item_profit = item.total_price - item.inventory_item.cost_price;
      return {
        amount:
          total_revenue !== 0 ? (item_profit / item.total_price) * 100 : 0,
        created_at: item.created_at,
      };
    });

    const loss_margin = saleProduct.map((item) => {
      const item_loss = item.inventory_item.cost_price - item.total_price;
      return {
        amount:
          total_revenue !== 0 && item_loss > 0
            ? (item_loss / item.total_price) * 100
            : 0,
        created_at: item.created_at,
      };
    });

    return {
      profit_margin,
      loss_margin,
      total_profit,
      total_profit_prev,
      total_revenue,
      total_revenue_prev,
      total_expenses,
      total_expenses_prev,
      net_profit,
      net_profit_prev,
      total_losses,
      total_losses_prev,
    };
  }

  async getTopSellingProducts(
    tenant_id: number,
    time_period: 'day' | 'week' | 'month' | 'year',
    limit: number = 5,
  ): Promise<TopSellingProduct[]> {
    const { current } = getTimeRanges(time_period);

    const dateCondition = {
      created_at: {
        gte: current.start,
        lte: current.end,
      },
    };

    const allSaleProducts = await this.postgresService.saleProduct.findMany({
      where: {
        tenant_id,
        ...dateCondition,
      },
      include: { inventory_item: { include: { product: true } } },
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
        const quantity = data.reduce((acc, item) => acc + item.quantity, 0);
        const revenue = data.reduce((acc, item) => acc + item.total_price, 0);

        const {
          inventory_item: { product },
        } = data[0];

        return {
          product: product.name,
          revenue,
          quantity,
          inventory_id,
        };
      }),
    );
    return topSellingProducts;
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

    const allSaleProducts = await this.postgresService.saleProduct.findMany({
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

        const product = await this.postgresService.inventory.findFirst({
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

  async getSalesOverview(
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

    const sales = await this.postgresService.sale.findMany({
      select: {
        created_at: true,
        total_price: true,
      },
      where: {
        tenant_id,
        ...dateCondition,
      },
    });

    const result = sales.map(
      (item) => ({
        created_at: item.created_at,
        amount: item.total_price,
      }),
      {},
    );
    const prepared_data = aggregateByTimestamp(result, time_period, labels);
    return prepared_data;
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

    const { profit_margin } = await this.calculateMetrics(
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

  async recentSales(tenant_id: number) {
    const recent_sales = await this.postgresService.sale.findMany({
      where: { tenant_id },
      include: { customer: true },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    return recent_sales;
  }
}
