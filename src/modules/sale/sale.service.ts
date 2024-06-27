import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSaleDto } from './dto/sales.dto';
import {
  FeeType,
  Inventory,
  NotifierType,
  PrismaClient,
  ProductStatusType,
  ValueType,
} from '@prisma/client';
import { OrmService } from 'src/database/orm.service';

import {
  QuantityUpdate,
  SalesStatsDto,
  page_generator,
  salesFilters,
} from '@app/common';
import {
  calculatePercentageChange,
  determineProductStatus,
  formatDate,
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

        const inventoryItem = await tx.inventory.findUnique({
          where: { id: productId, tenant_id },
          include: { product: { include: { expenses: true } } },
        });

        if (!inventoryItem) {
          throw new NotFoundException(`Product with ID ${productId} not found`);
        }

        if (inventoryItem.quantity < quantity) {
          throw new BadRequestException(
            `Insufficient quantity for product ${inventoryItem.name}`,
          );
        }

        totalProductExpenses = inventoryItem.product.expenses.reduce(
          (acc, expense) => acc + expense.amount || 0,
          0,
        );
        console.log({ totalProductExpenses });

        OverAlltotalExpenses += totalProductExpenses;
        const productSellingPrice =
          (inventoryItem.selling_price || 0) * quantity;
        console.log({ productSellingPrice });

        let totalFee = await this.calculateProductFee(
          tx as PrismaClient,
          tenant_id,
          inventoryItem.product_id,
          productSellingPrice,
        );
        console.log({ totalFee });
        //

        OverAllSellingPrice += productSellingPrice + totalFee;
        OverAllTotalQty += quantity;

        saleProducts.push({
          inventory_item: { connect: { id: productId } },
          quantity,
          expense: totalProductExpenses,
          unit_price: inventoryItem.selling_price,
          total_price: productSellingPrice,
          tenant: { connect: { id: tenant_id } },
        });
      }
      console.log({
        OverAllSellingPrice,
        OverAllTotalQty,
        OverAlltotalExpenses,
      });
      console.log(saleProducts);

      const created_sales = await tx.sale.create({
        data: {
          customer: { connect: { id: customerId } },
          sales_products: { create: saleProducts },
          tenant: { connect: { id: tenant_id } },
          quantity: OverAllTotalQty,
          expenses: OverAlltotalExpenses,
          total_price: OverAllSellingPrice,
        },
        include: {
          sales_products: { include: { inventory_item: true } },
        },
      });
      //

      await this.updateProductQtyAndStatus(
        created_sales,
        tx as PrismaClient,
        tenant_id,
      );

      return created_sales;
    });
  }

  private async calculateProductFee(
    tx: PrismaClient,
    tenant_id: number,
    productId: number,
    productSellingPrice: number,
  ) {
    let totalFee = 0;
    // Calculate fees for the product
    const fees = await tx.fees.findMany({
      where: { tenant_id },
      include: { products: true },
    });
    fees.forEach((fee) => {
      let feeAmount = 0;

      if (
        (fee.fee_type === FeeType.all ||
          fee.products.some((p) => p.id === productId)) &&
        fee.value_type === ValueType.fixed
      ) {
        feeAmount = fee.value;
        console.log(ValueType.fixed, fee.fee_type, fee.value, feeAmount);
      } else if (
        (fee.fee_type === FeeType.all ||
          fee.products.some((p) => p.id === productId)) &&
        fee.value_type === ValueType.percentage
      ) {
        feeAmount = (fee.value / 100) * productSellingPrice;
        console.log(ValueType.percentage, fee.fee_type, fee.value, feeAmount);
      }

      totalFee += feeAmount;
    });
    return totalFee;
  }

  private async updateProductQtyAndStatus(
    created_sales,
    tx: PrismaClient,
    tenant_id: number,
  ) {
    for (const saleProduct of created_sales.sales_products) {
      await tx.inventory.update({
        where: { id: saleProduct.inventory_item.id, tenant_id },
        data: {
          quantity: {
            decrement: saleProduct.quantity,
          },
        },
      });

      const inventory = await tx.inventory.findUnique({
        where: { id: saleProduct.inventory_item.id, tenant_id },
        include: { product: true },
      });

      const { status } = await this.getTotalQuantityByProduct(
        tx as PrismaClient,
        tenant_id,
        inventory,
      );

      await this.notifyProductStatus(
        status,
        tx as PrismaClient,
        tenant_id,
        inventory,
        inventory.quantity,
      );
    }
  }

  private async getTotalQuantityByProduct(
    tx: PrismaClient,
    tenant_id: number,
    inventory,
  ) {
    const threshold = inventory.product.threshold;
    const pid = inventory.product.id;

    const inventorySummary = await tx.inventory.groupBy({
      by: 'product_id',
      where: {
        product_id: Number(pid),
        tenant_id,
      },
      _sum: {
        quantity: true,
      },
      _min: {
        selling_price: true,
      },
      _max: {
        selling_price: true,
      },
    });

    console.log(inventorySummary);

    const total_qty = inventorySummary?.[0]?._sum?.quantity ?? 0;
    const min_price = inventorySummary?.[0]?._min?.selling_price ?? 0;
    const max_price = inventorySummary?.[0]?._max?.selling_price ?? 0;

    const status = determineProductStatus(total_qty, threshold);

    await tx.product.update({
      where: { id: Number(pid), tenant_id },
      data: {
        status,
        prices: `${min_price}-${max_price}`,
      },
    });

    return { total_qty, status };
  }

  private async notifyProductStatus(
    status: string,
    tx: PrismaClient,
    tenant_id: number,
    product: Inventory,
    qty: number,
  ) {
    if (status === ProductStatusType.running_low) {
      await tx.notification.create({
        data: {
          tenant_id,
          type: NotifierType.low_stock,
          products: [{ product: product.name, quantity: qty }],
        },
      });
    } else if (status === ProductStatusType.sold_out) {
      await tx.notification.create({
        data: {
          tenant_id,
          type: NotifierType.sold_out,
          products: [{ product: product.name, quantity: qty }],
        },
      });
    }
  }

  async getInvoice(tenant_id: number, salesId: number) {
    const sales = await this.postgresService.sale.findUnique({
      where: { id: salesId, tenant_id },
      include: {
        customer: true,
        sales_products: { include: { inventory_item: true } },
        _count: true,
      },
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
      orderBy: { created_at: 'desc' },
    });

    const totalCount = await this.postgresService.sale.count({
      where: { tenant_id },
    });
    return {
      data: all_sales || [],
      totalCount,
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
        tx as PrismaClient,
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
      const inventory = await tx.inventory.findUnique({
        where: { id: saleProduct.inventory_item.id, tenant_id },
        include: { product: true },
      });

      await tx.inventory.update({
        where: { id: inventory.id, tenant_id },
        data: {
          quantity: {
            increment: quantity,
          },
        },
      });

      await this.getTotalQuantityByProduct(
        tx as PrismaClient,
        tenant_id,
        inventory,
      );

      return `Successfully returned ${quantity} items `;
    });
  }

  private async returnSalesItem(
    tx: PrismaClient,
    saleId: number,
    tenant_id: number,
    productId: number,
    quantity: number,
  ) {
    const sale = await tx.sale.findUnique({
      where: { id: saleId, tenant_id },
      include: {
        customer: true,
        sales_products: { include: { inventory_item: true } },
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${saleId} not found`);
    }

    const saleProduct = sale.sales_products[0];

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
    return { saleProduct, sale };
  }

  async markProductAsDamaged(
    saleId: number,
    productId: number,
    quantity: number,
    tenant_id: number,
  ) {
    return await this.postgresService.$transaction(async (tx) => {
      const { saleProduct } = await this.returnSalesItem(
        tx as PrismaClient,
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

  async getSalesStats(
    tenant_id: number,
    start_date: Date,
    end_date: Date,
  ): Promise<SalesStatsDto> {
    const dateCondition: any = {};
    if (start_date && end_date) {
      const { startDate, endDate } = formatDate(start_date, end_date);
      dateCondition.created_at = {
        gte: startDate,
        lte: endDate,
      };
    }

    const sales = await this.postgresService.sale.findMany({
      where: {
        tenant_id,
        ...dateCondition,
      },
      include: {
        sales_products: {
          include: {
            inventory_item: true,
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

    const previousDateCondition = {
      created_at: {
        gte: firstDayOfLastMonth,
        lte: lastDayOfLastMonth,
      },
    };

    const salesLastMonth = await this.postgresService.sale.findMany({
      where: {
        tenant_id,
        ...previousDateCondition,
      },
      include: {
        sales_products: {
          include: {
            inventory_item: true,
          },
        },
      },
    });

    const lastMonthStats: SalesStatsDto = {
      totalSales: 0,
      totalProfits: 0,
      totalExpenses: 0,
      numberOfSoldProducts: 0,
      returnedProducts: 0,
    };

    this.calculateBasicStats(salesLastMonth, lastMonthStats);

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

  async duplicateSalesItem(
    tenant_id: number,
    saleId: number,
    saleItemId: number,
  ) {
    const existingSaleItem = await this.postgresService.saleProduct.findUnique({
      where: { id: saleItemId, saleId, tenant_id },
      include: {},
    });
    console.log({ existingSaleItem });

    if (!existingSaleItem) {
      throw new NotFoundException(`Sales item not found.`);
    }
    console.log({ existingSaleItem });

    const { id, created_at, updated_at, ...saleitem_data } = existingSaleItem;
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
    saleId: number,
    saleProductId: number,
    quantity: number,
  ) {
    return await this.postgresService.$transaction(async (tx) => {
      const saleProduct = await tx.saleProduct.findUnique({
        where: { id: saleProductId, saleId, tenant_id },
        include: { inventory_item: true, sale: true },
      });

      if (!saleProduct) {
        throw new NotFoundException('Sale product not found');
      }

      const product = await tx.inventory.findUnique({
        where: { id: saleProduct.inventory_item.id, tenant_id },
      });
      console.log(product.quantity < quantity);

      if (product.quantity < quantity) {
        throw new BadRequestException(`Invalid quantity for product`);
      }

      const totalSoldQuantity_beforeUpdate = await tx.saleProduct.aggregate({
        where: {
          saleId: saleProduct.saleId,
          inventory_id: saleProduct.inventory_id,
          tenant_id,
        },
        _sum: { quantity: true },
      });
      console.log({ totalSoldQuantity_beforeUpdate });

      await tx.saleProduct.update({
        where: { id: saleProductId, tenant_id, saleId: saleProduct.saleId },
        data: { quantity, total_price: quantity * saleProduct.unit_price },
      });

      const allSaleProducts = await tx.saleProduct.findMany({
        where: {
          saleId: saleProduct.saleId,
          tenant_id,
        },
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
          inventory_id: saleProduct.inventory_id,
          tenant_id,
        },
        _sum: { quantity: true },
      });

      const newQty = totalSoldQuantity._sum?.quantity; //all productId qty after update of saleproduct
      const prevQty = totalSoldQuantity_beforeUpdate._sum?.quantity; //all productId qty before update of saleproduct
      console.log({ newQty, prevQty });
      const qty = Math.abs(prevQty - newQty);

      console.log({ qty });

      const data: QuantityUpdate = { quantity: { decrement: qty } };

      if (prevQty > newQty) {
        data.quantity = { increment: qty }; // If previous quantity was greater, decrement
      }
      console.log({ data });

      await tx.inventory.update({
        where: { id: saleProduct.inventory_item.id, tenant_id },
        data,
      });

      const get_product = await tx.inventory.findUnique({
        where: { id: saleProduct.inventory_item.id, tenant_id },
      });

      await this.getTotalQuantityByProduct(
        tx as PrismaClient,
        tenant_id,
        get_product,
      );

      return await tx.saleProduct.findFirst({
        where: { id: saleProductId, tenant_id, saleId: saleProduct.saleId },
      });
    });
  }

  async getTopSellingProductsStats(
    tenant_id: number,
    start_date: Date,
    end_date: Date,
    limit: number = 5,
  ) {
    const dateCondition: any = {};
    if (start_date && end_date) {
      const { startDate, endDate } = formatDate(start_date, end_date);
      dateCondition.created_at = {
        gte: startDate,
        lte: endDate,
      };
    }
    const topSellingProducts = await this.postgresService.$transaction(
      async (tx) => {
        const allSaleProducts = await tx.saleProduct.findMany({
          where: {
            tenant_id,
            ...dateCondition,
          },
          include: { inventory_item: { include: { product: true } } },
          orderBy: { quantity: 'desc' },
          take: limit,
        });

        return allSaleProducts.map((saleProduct) => ({
          product: saleProduct.inventory_item.product.name,
          quantity: saleProduct.quantity,
          total_price: saleProduct.total_price,
        }));
      },
    );

    return topSellingProducts;
  }

  async getLeastSellingProductStats(
    tenant_id: number,
    start_date: Date,
    end_date: Date,
    limit: number = 5,
  ) {
    const dateCondition: any = {};
    if (start_date && end_date) {
      const { startDate, endDate } = formatDate(start_date, end_date);
      dateCondition.created_at = {
        gte: startDate,
        lte: endDate,
      };
    }
    const leastSellingProducts = await this.postgresService.$transaction(
      async (tx) => {
        const allSaleProducts = await tx.saleProduct.findMany({
          where: {
            tenant_id,
            ...dateCondition,
          },
          include: { inventory_item: { include: { product: true } } },
          orderBy: { quantity: 'asc' },
          take: limit,
        });

        const leastSellingProductStats = await Promise.all(
          allSaleProducts.map(async (saleProduct) => {
            const allSaleProducts = await tx.saleProduct.findMany({
              where: {
                tenant_id,
                inventory_id: saleProduct.inventory_id,
                ...dateCondition,
              },
              include: { inventory_item: { include: { product: true } } },
            });

            const totalQty = allSaleProducts.reduce(
              (acc, item) => acc + item.quantity,
              0,
            );
            const percentage =
              (totalQty / saleProduct.inventory_item.quantity) * 100;

            return {
              product: saleProduct.inventory_item.product.name,
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
        const unitCost = saleProduct.inventory_item.price || 0;
        const totalSellingPrice = saleProduct.total_price || 0;
        const quantitySold = saleProduct.quantity;

        const profitPerProduct = (totalSellingPrice - unitCost) * quantitySold;

        stats.totalProfits += profitPerProduct;

        stats.numberOfSoldProducts += saleProduct.quantity;
        stats.returnedProducts += saleProduct.returned_counts;
      }
    }
  }
}
