import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSaleDto } from './dto/sales.dto';
import { ProductStatusType, SaleProduct } from '@prisma/client';
import { OrmService } from 'src/database/orm.service';
import {
  IN_STOCK_COUNT,
  SOLD_OUT_COUNT,
} from '@app/common/constants/constants';
import {
  QuantityUpdate,
  SalesStatsDto,
  page_generator,
  salesFilters,
} from '@app/common';
import {
  calculatePercentageChange,
  getLastMonthDateRange,
} from '@app/common/helpers';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';

@Injectable()
export class SaleService {
  constructor(private readonly postgresService: OrmService) {}

  async createCustomerSales(data: CreateSaleDto, tenant_id: number) {
    const { customerId, products } = data;

    return await this.postgresService.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId, tenant_id },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      let OverAlltotalExpenses = 0;
      let OverAllSellingPrice = 0;
      let OverAllTotalQty = 0;
      let totalProductExpenses = 0;
      const saleProducts = [];

      for (const product_item of products) {
        const { productId, quantity } = product_item;

        const product = await tx.product.findUnique({
          where: { id: productId, tenant_id },
          include: { Expense: true },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${productId} not found`);
        }

        if (product.quantity < quantity) {
          throw new BadRequestException(
            `Insufficient quantity for product ID ${productId}`,
          );
        }

        totalProductExpenses = product.Expense.reduce(
          (acc, expense) => acc + expense.amount || 0,
          0,
        );

        OverAlltotalExpenses += totalProductExpenses;
        const productSellingPrice =
          (product.expected_selling_price || 0) * quantity;

        OverAllSellingPrice += productSellingPrice;
        OverAllTotalQty += quantity;

        saleProducts.push({
          product: { connect: { id: productId } },
          quantity,
          expense: totalProductExpenses,
          unit_price: product.cost_price,
          total_price: productSellingPrice,
          tenant: { connect: { id: tenant_id } },
        });
      }
      const created_sales = await tx.sale.create({
        data: {
          customer: { connect: { id: customerId } },
          sales_products: { create: saleProducts },
          tenant: { connect: { id: tenant_id } },
          quantity: OverAllTotalQty,
          expenses: OverAlltotalExpenses,
          total_price: OverAllSellingPrice,
        },
        include: { sales_products: true, customer: true },
      });

      for (const saleProduct of created_sales.sales_products) {
        await tx.product.update({
          where: { id: saleProduct.productId, tenant_id },
          data: {
            quantity: {
              decrement: saleProduct.quantity,
            },
          },
        });

        const product = await tx.product.findUnique({
          where: { id: saleProduct.productId, tenant_id },
        });

        const remainingQuantity = product.quantity;

        await tx.product.update({
          where: { id: saleProduct.productId, tenant_id },
          data: {
            status: this.determineProductStatus(remainingQuantity),
          },
        });
      }
      return created_sales;
    });
  }

  async getInvoice(tenant_id: number, salesId: number) {
    const sales = await this.postgresService.sale.findUnique({
      where: { id: salesId, tenant_id },
      include: { customer: true, sales_products: true, _count: true },
    });
    if (!sales) {
      throw new NotFoundException('Sales Invoice not found');
    }
    return sales;
  }

  async getAllSales(tenant_id: number, filters: PaginatorDTO) {
    const { skip, take } = page_generator(
      Number(filters.page),
      Number(filters.pageSize),
    );
    const filter = salesFilters(filters);

    const whereCondition = filter ? { tenant_id, ...filter } : { tenant_id };

    const all_sales = await this.postgresService.sale.findMany({
      where: whereCondition,
      include: { customer: true },
      skip,
      take,
    });

    return {
      data: all_sales || [],
      totalCount: all_sales.length || 0,
      pageInfo: {
        currentPage: Number(filters.page),
        perPage: Number(filters.pageSize),
        hasNextPage:
          all_sales.length > Number(filters.page) * Number(filters.pageSize),
      },
    };
  }

  async returnProductItem(
    saleId: number,
    productId: number,
    quantity: number,
    tenant_id: number,
  ) {
    return await this.postgresService.$transaction(async (tx) => {
      const { saleProduct, sale } = await this.returnSalesItem(
        tx,
        saleId,
        tenant_id,
        productId,
        quantity,
      );
      console.log({ saleProduct, sale });

      const newQty = saleProduct.quantity - quantity;
      const refundAmount = saleProduct.unit_price * quantity;
      console.log({ newQty, refundAmount });

      const newSelligPrice = saleProduct.unit_price * newQty;

      await tx.saleProduct.update({
        where: { id: saleProduct.id },
        data: {
          returned_counts: {
            increment: quantity,
          },
          total_price: newSelligPrice,
          // quantity: {
          //   decrement: quantity,
          // },
        },
      });

      await tx.sale.update({
        where: { id: saleId, tenant_id },
        data: {
          quantity: {
            decrement: quantity,
          },
          total_price: sale.total_price - refundAmount,
        },
      });

      const product = await tx.product.findUnique({
        where: { id: productId, tenant_id },
      });

      const remainingQuantity = product.quantity - quantity;

      await tx.product.update({
        where: { id: productId, tenant_id },
        data: {
          quantity: {
            increment: quantity,
          },
          status: this.determineProductStatus(remainingQuantity),
        },
      });

      return `Successfully returned ${quantity} items `;
    });
  }

  async markProductAsDamaged(
    saleId: number,
    productId: number,
    quantity: number,
    tenant_id: number,
  ) {
    return await this.postgresService.$transaction(async (tx) => {
      const { saleProduct } = await this.returnSalesItem(
        tx,
        saleId,
        tenant_id,
        productId,
        quantity,
      );

      await tx.saleProduct.update({
        where: { id: saleProduct.id },
        data: {
          damaged_counts: {
            increment: quantity,
          },
        },
      });

      return `Successfully marked ${quantity} items as damaged`;
    });
  }

  async getSalesStats(tenant_id: number): Promise<SalesStatsDto> {
    const sales = await this.postgresService.sale.findMany({
      where: {
        tenant_id,
      },
      include: {
        sales_products: {
          include: {
            product: true,
          },
        },
      },
    });

    const stats: SalesStatsDto = {
      totalSales: 0,
      totalProfits: 0,
      totalExpenses: 0,
      numberOfSoldProducts: 0,
      returnedProducts: 0,

      salesIncreasePercentage: 0,
      profitsIncreasePercentage: 0,
      expensesIncreasePercentage: 0,
      soldProductsIncreasePercentage: 0,
      returnedProductsIncreasePercentage: 0,
    };

    this.calculateBasicStats(sales, stats);

    const { firstDayOfLastMonth, lastDayOfLastMonth } = getLastMonthDateRange();

    console.log(firstDayOfLastMonth);
    console.log(lastDayOfLastMonth);

    const salesLastMonth = await this.postgresService.sale.findMany({
      where: {
        tenant_id,
        created_at: {
          gte: firstDayOfLastMonth,
          lte: lastDayOfLastMonth,
        },
      },
      include: {
        sales_products: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log({ salesLastMonth });

    const lastMonthStats: SalesStatsDto = {
      totalSales: 0,
      totalProfits: 0,
      totalExpenses: 0,
      numberOfSoldProducts: 0,
      returnedProducts: 0,
    };

    this.calculateBasicStats(salesLastMonth, lastMonthStats);
    // console.log(2, { lastMonthStats });

    // Calculate percentage increase or decrease for last month
    this.determinePercentages(stats, lastMonthStats);

    return stats;
  }

  async deleteSale(tenant_id: number, saleId: number) {
    return await this.postgresService.sale.delete({
      where: { tenant_id, id: saleId },
    });
  }

  async deleteSaleItem(tenant_id: number, saleProductId: number) {
    return await this.postgresService.saleProduct.delete({
      where: { tenant_id, id: saleProductId },
    });
  }

  async duplicateSalesItem(tenant_id: number, saleItemId: number) {
    const existingSaleItem = await this.postgresService.saleProduct.findUnique({
      where: { id: saleItemId, tenant_id },
      include: {},
    });
    console.log({ existingSaleItem, tenant_id, saleItemId });

    if (!existingSaleItem) {
      throw new NotFoundException(
        `Sales item with ID ${saleItemId} not found.`,
      );
    }
    const { id, ...saleitem_data } = existingSaleItem;
    return await this.postgresService.saleProduct.create({
      data: {
        ...saleitem_data,
        quantity: 0,
        total_price: 0,
        returned_counts: 0,
        damaged_counts: 0,
      },
    });
  }

  async editSaleProductQuantity(
    tenant_id: number,
    saleProductId: number,
    quantity: number,
  ) {
    return await this.postgresService.$transaction(async (tx) => {
      const saleProduct = await tx.saleProduct.findUnique({
        where: { id: saleProductId, tenant_id },
        include: { product: true, sale: true },
      });

      if (!saleProduct) {
        throw new NotFoundException('Sale product not found');
      }

      const product = await tx.product.findUnique({
        where: { id: saleProduct.productId, tenant_id },
      });
      console.log(product.quantity < quantity);

      if (product.quantity < quantity) {
        throw new BadRequestException(
          `Invalid quantity for product ID ${saleProduct.productId}`,
        );
      }

      const totalSoldQuantity_beforeUpdate = await tx.saleProduct.aggregate({
        where: {
          saleId: saleProduct.saleId,
          productId: saleProduct.productId,
          tenant_id,
        },
        _sum: { quantity: true },
      });
      const updatedSaleProduct = await tx.saleProduct.update({
        where: { id: saleProductId, tenant_id, saleId: saleProduct.saleId },
        data: { quantity, total_price: quantity * saleProduct.unit_price },
      });
      console.log({ updatedSaleProduct });

      const allSaleProducts = await tx.saleProduct.findMany({
        where: { saleId: saleProduct.saleId, tenant_id },
      });
      const totalQuantity = allSaleProducts.reduce(
        (acc, product) => acc + product.quantity,
        0,
      );
      const totalPrice = allSaleProducts.reduce(
        (acc, product) => acc + product.total_price,
        0,
      );
      console.log({ totalQuantity, totalPrice });

      await tx.sale.update({
        where: { id: saleProduct.saleId, tenant_id },
        data: {
          quantity: totalQuantity,
          total_price: totalPrice,
        },
      });

      const totalSoldQuantity = await tx.saleProduct.aggregate({
        where: {
          saleId: saleProduct.saleId,
          productId: saleProduct.productId,
          tenant_id,
        },
        _sum: { quantity: true },
      });
      const newQty = totalSoldQuantity._sum?.quantity; //all productId qty after update of saleproduct
      const prevQty = totalSoldQuantity_beforeUpdate._sum?.quantity; //all productId qty before update of saleproduct
      console.log({ newQty, prevQty });
      const qty = Math.abs(prevQty - newQty);

      // ...
      console.log({ qty });

      const data: QuantityUpdate = { quantity: { decrement: qty } }; // Always increment

      if (prevQty > newQty) {
        data.quantity = { increment: qty }; // If previous quantity was greater, decrement
      }
      console.log({ data });

      await tx.product.update({
        where: { id: saleProduct.productId, tenant_id },
        data,
      });

      const get_product = await tx.product.findUnique({
        where: { id: saleProduct.productId, tenant_id },
      });
      console.log({ get_product });

      await tx.product.update({
        where: { id: saleProduct.productId, tenant_id },
        data: {
          status: this.determineProductStatus(get_product.quantity),
        },
      });
      return updatedSaleProduct;
    });
  }

  async getTopSellingProductsStats(tenant_id: number, limit: number = 5) {
    const topSellingProducts = await this.postgresService.$transaction(
      async (tx) => {
        const allSaleProducts = await tx.saleProduct.findMany({
          where: { tenant_id },
          include: { product: true },
          orderBy: { quantity: 'desc' },
          take: limit,
        });

        return allSaleProducts.map((saleProduct) => ({
          product: saleProduct.product.name,
          quantity: saleProduct.quantity,
          total_price: saleProduct.total_price,
        }));
      },
    );

    return topSellingProducts;
  }

  async getLeastSellingProductStats(tenant_id: number, limit: number = 5) {
    const leastSellingProducts = await this.postgresService.$transaction(
      async (tx) => {
        const allSaleProducts = await tx.saleProduct.findMany({
          where: { tenant_id },
          include: { product: true },
          orderBy: { quantity: 'asc' },
          take: limit,
        });

        const leastSellingProductStats = await Promise.all(
          allSaleProducts.map(async (saleProduct) => {
            const totalSoldQuantity = await tx.saleProduct.aggregate({
              where: { productId: saleProduct.productId, tenant_id },
              _sum: { quantity: true },
            });

            const percentage =
              ((totalSoldQuantity._sum?.quantity || 0) /
                saleProduct.product.quantity) *
              100;

            return {
              product: saleProduct.product.name,
              percentage,
            };
          }),
        );

        return leastSellingProductStats;
      },
    );

    return leastSellingProducts;
  }

  private determinePercentages(
    stats: SalesStatsDto,
    statsLastMonth: SalesStatsDto,
  ) {
    stats.salesIncreasePercentage =
      calculatePercentageChange(stats.totalSales, statsLastMonth.totalSales) ||
      0;
    console.log({ salesIncreasePercentage: stats.salesIncreasePercentage });

    stats.profitsIncreasePercentage =
      calculatePercentageChange(
        stats.totalProfits,
        statsLastMonth.totalProfits,
      ) || 0;
    stats.expensesIncreasePercentage =
      calculatePercentageChange(
        stats.totalExpenses,
        statsLastMonth.totalExpenses,
      ) || 0;
    stats.soldProductsIncreasePercentage =
      calculatePercentageChange(
        stats.numberOfSoldProducts,
        statsLastMonth.numberOfSoldProducts,
      ) || 0;
    stats.returnedProductsIncreasePercentage =
      calculatePercentageChange(
        stats.returnedProducts,
        statsLastMonth.returnedProducts,
      ) || 0;
  }

  private calculateBasicStats(sales, stats) {
    for (const sale of sales) {
      stats.totalSales += sale.total_price;
      stats.totalExpenses += sale.expenses;

      for (const saleProduct of sale.sales_products) {
        const unitCost = saleProduct.product.expected_selling_price || 0;
        const profit = (saleProduct.product.cost_price || 0) - unitCost;
        stats.totalProfits += profit * saleProduct.quantity;
        stats.numberOfSoldProducts += saleProduct.quantity;
        stats.returnedProducts += saleProduct.returned_counts;
      }
    }
  }

  private async returnSalesItem(
    tx,
    saleId: number,
    tenant_id: number,
    productId: number,
    quantity: number,
  ) {
    const sale = await tx.sale.findUnique({
      where: { id: saleId, tenant_id },
      include: {
        customer: true,
        sales_products: {
          where: { productId },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${saleId} not found`);
    }

    const product = await tx.product.findUnique({
      where: { id: productId, tenant_id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    const saleProduct = sale.sales_products[0] as SaleProduct;

    if (!saleProduct) {
      throw new NotFoundException(
        `Product with ID ${productId} not found in the sale`,
      );
    }

    if (quantity > saleProduct.quantity) {
      throw new BadRequestException(
        `Invalid quantity for product ID ${productId}`,
      );
    }
    return { saleProduct, product, sale };
  }

  private determineProductStatus(remainingQuantity: number): ProductStatusType {
    console.log({ remainingQuantity });

    if (remainingQuantity === SOLD_OUT_COUNT) {
      return ProductStatusType.sold_out;
    } else if (remainingQuantity >= IN_STOCK_COUNT) {
      //10-...
      return ProductStatusType.in_stock;
    } else {
      //1-9
      return ProductStatusType.running_low;
    }
  }
}
