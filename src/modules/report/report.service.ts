import { Injectable } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { ReportDashboardStatsDto } from './dto/report.dto';
import { formatDate, mappedData } from '@app/common/helpers';

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
      include: { product: true },
      orderBy: { quantity: 'desc' },
      take: limit,
    });

    const topSellingProducts = await Promise.all(
      allSaleProducts.map(async (saleProduct) => {
        const product = await this.prismaService.product.findFirst({
          where: { tenant_id, id: saleProduct.product.id },
        });

        return {
          product: saleProduct.product.name,
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
    console.log(sales);

    const profitMarginStats: { created_at: Date; num: number }[] = [];

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
        num: profitMargin,
      });
    }

    const result = mappedData(profitMarginStats);

    return result;
  }

  async calculateLossMargin(
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
    console.log(sales);

    const lossMarginStats: { created_at: Date; num: number }[] = [];

    for (const sale of sales) {
      const totalRevenue = sale.total_price;
      const totalExpenses = sale.expenses;
      const loss = totalExpenses - totalRevenue;

      const lossMargin = (loss / totalExpenses) * 100;

      lossMarginStats.push({
        created_at: sale.created_at,
        num: lossMargin,
      });
    }
    console.log(lossMarginStats.map((s) => s));

    const result = mappedData(lossMarginStats);

    return result;
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
        Sale: {
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
        totalSalesAmount: customer.Sale.reduce(
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
