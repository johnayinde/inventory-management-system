import { Injectable } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { ReportDashboardStatsDto } from './dto/report.dto';
import { formatDate, mappedData } from '@app/common/helpers';
import { LossMarginData, ProfitMarginData } from '../dashboard/interface';

@Injectable()
export class ReportService {
  constructor(private readonly prismaService: OrmService) {}

  async getDashboardStats(
    tenant_id: number,
    startDate: Date,
    endDate: Date,
  ): Promise<ReportDashboardStatsDto> {
    const { totalRevenue, totalExpenses, expenses } =
      await this.calculateRevenueAndExpenses(tenant_id, startDate, endDate);

    const netProfit = totalRevenue - totalExpenses;

    const totalLosses = expenses.reduce((sum, expense) => {
      return expense.amount < 0 ? sum + Math.abs(expense.amount) : sum;
    }, 0);

    return {
      totalRevenue,
      netProfit,
      totalExpenses,
      totalLosses,
    };
  }

  async getCustomerStats(tenant_id: number, start_date: Date, end_date: Date) {
    const { endDate, startDate } = formatDate(start_date, end_date);
    const customers = await this.prismaService.customer.groupBy({
      by: ['created_at'],
      _count: { id: true },
      where: {
        tenant_id,
        updated_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const result = mappedData(customers, '_count', 'id');

    return result;
  }

  async getTopSellingProductsStats(
    tenant_id: number,
    start_date: Date,
    end_date: Date,
    limit: number = 5,
  ) {
    const { endDate, startDate } = formatDate(start_date, end_date);

    const allSaleProducts = await this.prismaService.saleProduct.findMany({
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
    start_date: Date,
    end_date: Date,
  ): Promise<ProfitMarginData[]> {
    const { endDate, startDate } = formatDate(start_date, end_date);

    const sales = await this.prismaService.sale.findMany({
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

  async calculateLossMargin(
    tenant_id: number,
    start_date: Date,
    end_date: Date,
  ): Promise<LossMarginData[]> {
    const { endDate, startDate } = formatDate(start_date, end_date);

    const sales = await this.prismaService.sale.findMany({
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

    const lossMarginStats: { created_at: Date; lossMargin: number }[] = [];

    for (const sale of sales) {
      const totalRevenue = sale.total_price;
      const totalExpenses = sale.expenses;
      const loss = totalExpenses - totalRevenue;

      const lossMargin = (loss / totalExpenses) * 100;

      lossMarginStats.push({
        created_at: sale.created_at,
        lossMargin: lossMargin,
      });
    }
    const aggregatedLossMargin = lossMarginStats.reduce((acc, item) => {
      const dateKey = item.created_at.toISOString().split('T')[0];

      if (acc[dateKey]) {
        acc[dateKey].lossMargin += item.lossMargin || 0;
      } else {
        acc[dateKey] = {
          created_at: new Date(dateKey),
          lossMargin: item.lossMargin || 0,
        };
      }

      return acc;
    }, {} as Record<string, LossMarginData>);

    // Convert the aggregated data back to an array
    const resultArray = Object.values(aggregatedLossMargin);

    return resultArray;
  }

  async calculateExpenseStats(
    tenant_id: number,
    start_date: Date,
    end_date: Date,
  ) {
    const { endDate, startDate } = formatDate(start_date, end_date);

    const expenses = await this.prismaService.expense.groupBy({
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

  async CustomerSalesStats(
    tenant_id: number,
    start_date: Date,
    end_date: Date,
    limit: number = 5,
  ) {
    const { endDate, startDate } = formatDate(start_date, end_date);

    const customersWithSales = await this.prismaService.customer.findMany({
      where: {
        tenant_id,
        updated_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        sales: {
          where: {
            created_at: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    const customerAnalytics = customersWithSales
      .map((customer) => ({
        customerName: customer.name,
        totalSalesAmount: customer.sales.reduce(
          (sum, sale) => sum + sale.total_price,
          0,
        ),
      }))
      .sort((a, b) => b.totalSalesAmount - a.totalSalesAmount)
      .slice(0, limit);

    return customerAnalytics; // return allSale.map((sale) => ({
    //   customer: sale.customer.name,
    //   amount: sale.total_price,
    // }));
  }

  async totalRevenue(tenant_id: number, start_date: Date, end_date: Date) {
    const { endDate, startDate } = formatDate(start_date, end_date);
    const sales = await this.prismaService.sale.findMany({
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

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_price, 0);

    const revenueStats: { created_at: Date; num: number }[] = [];

    for (const sale of sales) {
      const totalRevenue = sale.total_price;

      revenueStats.push({
        created_at: sale.created_at,
        num: totalRevenue,
      });
    }

    const result = mappedData(revenueStats);
    return result;
  }

  private async calculateRevenueAndExpenses(
    tenant_id: number,
    start_date: Date,
    end_date: Date,
  ) {
    const { endDate, startDate } = formatDate(start_date, end_date);

    const sales = await this.prismaService.sale.findMany({
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

    const expenses = await this.prismaService.expense.findMany({
      where: {
        tenant_id,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_price, 0);

    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );

    return { totalRevenue, totalExpenses, expenses, sales };
  }
}
