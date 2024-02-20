import { Injectable } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { ReportDashboardStatsDto } from './dto/report.dto';

@Injectable()
export class ReportService {
  constructor(private readonly prismaService: OrmService) {}
  private formatDate(date: Date) {
    // Format the date as needed (e.g., yyyy-mm-dd)
    const datetime = new Date(date).toISOString();
    console.log({ datetime });
    return datetime;
  }
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

  async getCustomerStats(tenant_id: number, startDate: Date, endDate: Date) {
    const customers = await this.prismaService.customer.findMany({
      // orderBy: { created_at: 'desc' },
      where: {
        tenant_id,

        updated_at: {
          gte: this.formatDate(startDate),
          lte: this.formatDate(endDate),
        },
      },
    });

    console.log({ customers });
    return customers.map((customer) => ({
      date: customer.created_at,
      name: customer.name,
    }));
  }

  // private getDateFromType(date: Date, type: string, typeRange: number): Date {
  //   const clonedDate = new Date(date);

  //   switch (type) {
  //     case 'year':
  //       clonedDate.setFullYear(clonedDate.getFullYear() - typeRange);
  //       break;
  //     case 'month':
  //       clonedDate.setMonth(clonedDate.getMonth() - typeRange);
  //       break;
  //     case 'week':
  //       clonedDate.setDate(clonedDate.getDate() - typeRange * 7);
  //       break;
  //     case 'day':
  //       clonedDate.setDate(clonedDate.getDate() - typeRange);
  //       break;
  //   }

  //   return clonedDate;
  // }

  async getTopSellingProductsStats(
    tenant_id: number,
    startDate: Date,
    endDate: Date,
    limit: number = 5,
  ) {
    const topSellingProducts = await this.prismaService.$transaction(
      async (tx) => {
        const allSaleProducts = await tx.saleProduct.findMany({
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

        return allSaleProducts.map(async (saleProduct) => {
          const product = await tx.product.findUnique({
            where: { tenant_id, id: saleProduct.product.id },
          });

          return {
            product: saleProduct.product.name,
            purchased_quantity: saleProduct.quantity,
            total_price: saleProduct.total_price,
            remaining_quantity: product.quantity,
          };
        });
      },
    );

    return topSellingProducts;
  }

  // ////

  async calculateProfitMargin(
    tenant_id: number,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const { totalRevenue, totalExpenses, sales } =
      await this.calculateRevenueAndExpenses(tenant_id, startDate, endDate);

    const totalCOGS = sales.reduce(
      (sum, sale) =>
        sum +
        sale.sales_products.reduce(
          (productSum, saleProduct) => productSum + saleProduct.expense,
          0,
        ),
      0,
    );

    const profit = totalRevenue - totalCOGS - totalExpenses;

    if (totalRevenue === 0) {
      return 0;
    }

    const profitMargin = (profit / totalRevenue) * 100;

    return profitMargin;
  }

  async calculateLossMargin(
    tenant_id: number,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const { totalRevenue, totalExpenses } =
      await this.calculateRevenueAndExpenses(tenant_id, startDate, endDate);

    const loss = totalExpenses - totalRevenue;

    if (totalExpenses === 0) {
      return 0; // To avoid division by zero
    }

    const lossMargin = (loss / totalExpenses) * 100;

    return lossMargin;
  }

  async calculateExpenseStats(
    tenant_id: number,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const { totalExpenses } = await this.calculateRevenueAndExpenses(
      tenant_id,
      startDate,
      endDate,
    );

    return totalExpenses;
  }

  async CustomerSalesStats(
    tenant_id: number,
    startDate: Date,
    endDate: Date,
    limit: number = 5,
  ) {
    const topSellingProductsByCustomer = await this.prismaService.$transaction(
      async (tx) => {
        const allSale = await tx.sale.findMany({
          where: {
            tenant_id,
            created_at: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: { customer: true },
          orderBy: { quantity: 'desc' },
          take: limit,
        });

        return allSale.map(async (sale) => {
          return {
            customer: sale.customer.name,
            amount: sale.total_price,
          };
        });
      },
    );

    return topSellingProductsByCustomer;
  }

  async totalRevenue(
    tenant_id: number,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const { totalRevenue } = await this.calculateRevenueAndExpenses(
      tenant_id,
      startDate,
      endDate,
    );

    return totalRevenue;
  }

  private async calculateRevenueAndExpenses(
    tenant_id: number,
    startDate: Date,
    endDate: Date,
  ) {
    const sales = await this.prismaService.sale.findMany({
      where: {
        tenant_id,
        created_at: {
          gte: this.formatDate(startDate),
          lte: this.formatDate(endDate),
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
          gte: this.formatDate(startDate),
          lte: this.formatDate(endDate),
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
