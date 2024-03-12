import { Injectable } from '@nestjs/common';
import {
  AnalyticsResult,
  ProfitMarginData,
  SalesOverviewData,
  TopSellingProduct,
} from './interface';
import { OrmService } from 'src/database/orm.service';
import { formatDate, getLastMonthDateRange } from '@app/common/helpers';

@Injectable()
export class DashboardService {
  constructor(private readonly postgresService: OrmService) {}

  async calculateAnalytics(
    tenant_id: number,
    start_date: Date,
    end_date: Date,
  ): Promise<AnalyticsResult> {
    const { endDate, startDate } = formatDate(start_date, end_date);

    const totalSales = await this.postgresService.sale.count({
      where: {
        tenant_id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalRevenue = await this.postgresService.sale.aggregate({
      where: {
        tenant_id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        total_price: true,
      },
    });

    const totalProfit = await this.postgresService.sale.aggregate({
      where: {
        tenant_id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        total_price: true,
        expenses: true,
      },
    });

    const totalInventory = await this.postgresService.inventory.count({
      where: {
        tenant_id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const { firstDayOfLastMonth, lastDayOfLastMonth } = getLastMonthDateRange();

    const previousTotalSales = await this.postgresService.sale.count({
      where: {
        tenant_id,
        created_at: {
          gte: firstDayOfLastMonth,
          lte: lastDayOfLastMonth,
        },
      },
    });

    const previousTotalRevenue = await this.postgresService.sale.aggregate({
      _sum: {
        total_price: true,
      },
      where: {
        tenant_id,
        created_at: {
          gte: firstDayOfLastMonth,
          lte: lastDayOfLastMonth,
        },
      },
    });

    const previousTotalProfit = await this.postgresService.sale.aggregate({
      _sum: {
        total_price: true,
        expenses: true,
      },
      where: {
        tenant_id,
        created_at: {
          gte: firstDayOfLastMonth,
          lte: lastDayOfLastMonth,
        },
      },
    });

    const previousTotalInventory = await this.postgresService.inventory.count({
      where: {
        tenant_id,
        created_at: {
          gte: firstDayOfLastMonth,
          lte: lastDayOfLastMonth,
        },
      },
    });

    const calculateChangePercentage = (
      current: number,
      previous: number,
    ): number => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    const salesChangePercentage = calculateChangePercentage(
      totalSales,
      previousTotalSales,
    );
    const revenueChangePercentage = calculateChangePercentage(
      totalRevenue._sum.total_price,
      previousTotalRevenue._sum.total_price,
    );

    const profitChangePercentage = calculateChangePercentage(
      totalProfit._sum.total_price - totalProfit._sum.expenses,
      previousTotalProfit._sum.total_price - previousTotalProfit._sum.expenses,
    );
    const inventoryChangePercentage = calculateChangePercentage(
      totalInventory,
      previousTotalInventory,
    );

    return {
      totalSales,
      totalRevenue: totalRevenue._sum.total_price || 0,
      totalProfit:
        totalProfit._sum.total_price - totalProfit._sum.expenses || 0,
      totalInventory,
      salesChangePercentage,
      revenueChangePercentage,
      profitChangePercentage,
      inventoryChangePercentage,
    };
  }

  async getTopSellingProducts(
    tenant_id: number,
    start_date: Date,
    end_date: Date,
    limit: number = 5,
  ): Promise<TopSellingProduct[]> {
    const { endDate, startDate } = formatDate(start_date, end_date);

    const allSaleProducts = await this.postgresService.saleProduct.findMany({
      where: {
        tenant_id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
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
    start_date: Date,
    end_date: Date,
    limit: number = 5,
  ) {
    const { endDate, startDate } = formatDate(start_date, end_date);

    const allSaleProducts = await this.postgresService.saleProduct.findMany({
      where: {
        tenant_id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
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
    start_date: Date,
    end_date: Date,
  ): Promise<SalesOverviewData[]> {
    const { endDate, startDate } = formatDate(start_date, end_date);

    const sales = await this.postgresService.sale.findMany({
      select: {
        created_at: true,
        total_price: true,
      },
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        tenant_id,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    // Aggregate the sales data by date
    const aggregatedSales = sales.reduce((acc, item) => {
      const dateKey = item.created_at.toISOString().split('T')[0];

      if (acc[dateKey]) {
        acc[dateKey].revenue += item.total_price || 0;
      } else {
        acc[dateKey] = {
          date: new Date(dateKey),
          revenue: item.total_price || 0,
        };
      }

      return acc;
    }, {} as Record<string, SalesOverviewData>);

    // Convert the aggregated data back to an array
    const resultArray = Object.values(aggregatedSales);

    return resultArray;
  }

  async calculateProfitMargin(
    tenant_id: number,
    start_date: Date,
    end_date: Date,
  ): Promise<ProfitMarginData[]> {
    const { endDate, startDate } = formatDate(start_date, end_date);

    const sales = await this.postgresService.sale.findMany({
      where: {
        tenant_id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        sales_products: true,
      },
    });

    const profitMarginStats: { created_at: Date; profitMargin: number }[] = [];

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
        profitMargin,
      });
    }

    // Aggregate the profit margin data by date
    const aggregatedProfitMargin = profitMarginStats.reduce((acc, item) => {
      const dateKey = item.created_at.toISOString().split('T')[0];

      if (acc[dateKey]) {
        acc[dateKey].profitMargin += item.profitMargin || 0;
      } else {
        acc[dateKey] = {
          created_at: new Date(dateKey),
          profitMargin: item.profitMargin || 0,
        };
      }

      return acc;
    }, {} as Record<string, ProfitMarginData>);

    // Convert the aggregated data back to an array
    const resultArray = Object.values(aggregatedProfitMargin);

    return resultArray;
  }
}