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

    const totalRevenue = await this.postgresService.sale.aggregate({
      where: {
        tenant_id,
        ...dateCondition,
      },
      _sum: {
        total_price: true,
      },
    });

    const { total_profit, total_profit_prev } = await this.calculateMetrics(
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

    const previousTotalRevenue = await this.postgresService.sale.aggregate({
      _sum: {
        total_price: true,
      },
      where: {
        tenant_id,
        ...previousDateCondition,
      },
    });

    const previousTotalProfit = await this.postgresService.sale.aggregate({
      _sum: {
        total_price: true,
        expenses: true,
      },
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
      totalRevenue._sum.total_price,
      previousTotalRevenue._sum.total_price,
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
      totalRevenue: totalRevenue._sum.total_price || 0,
      totalProfit: total_profit || 0,
      totalInventory,
      salesChangePercentage,
      revenueChangePercentage,
      profitChangePercentage,
      inventoryChangePercentage,
    };
  }

  private async calculateMetrics(
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

    const total_revenue = saleProduct.reduce(
      (sac, item) => sac + item.total_price,
      0,
    );
    const cost_price = saleProduct.reduce(
      (sac, item) => sac + item.inventory_item.cost_price,
      0,
    );

    const total_revenue_prev = saleProduct_prev.reduce(
      (sac, item) => sac + item.total_price,
      0,
    );
    const cost_price_prev = saleProduct_prev.reduce(
      (sac, item) => sac + item.inventory_item.cost_price,
      0,
    );
    const profit_margin = saleProduct.map((item) => ({
      profitMargin: ((total_revenue - cost_price) / total_revenue) * 100,
      created_at: item.created_at,
    }));
    return {
      total_profit: total_revenue - cost_price,
      total_profit_prev: total_revenue_prev - cost_price_prev,
      profit_margin,
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

        sale: { tenant_id },
      },
      include: { inventory_item: { include: { product: true } } },
      orderBy: { total_price: 'desc' },
      take: limit,
    });

    const topSellingProducts = await Promise.all(
      allSaleProducts.map(async (saleProduct) => {
        return {
          product: saleProduct.inventory_item.name,
          revenue: saleProduct.total_price || 0,
          quantity: saleProduct.quantity || 0,
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
      include: { inventory_item: { include: { product: true } } },
      orderBy: { quantity: 'desc' },
      take: limit,
    });

    const topSellingProducts = await Promise.all(
      allSaleProducts.map(async (saleProduct) => {
        const product = await this.postgresService.inventory.findFirst({
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

    const prepared_data = aggregateByTimestamp(sales, time_period, labels);
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
