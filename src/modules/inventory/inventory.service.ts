import { Injectable } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateInventoryDto } from './dto/inventory.dto';
import { Inventory, PricingType } from '@prisma/client';
import {
  calculatePercentageChange,
  getLastMonthDateRange,
} from '@app/common/helpers';
import {
  InventoryStatsDto,
  inventoryFilters,
  page_generator,
} from '@app/common';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly postgresService: OrmService) {}
  async create(createInventoryDto: CreateInventoryDto, tenant_id: number) {
    return await this.postgresService.$transaction(async (tx) => {
      const {
        products_ids,
        individual_products,
        expenses,
        pricing_type,
        ...inventoryData
      } = createInventoryDto;

      const create_inventory = await tx.inventory.create({
        data: {
          ...inventoryData,
          pricing_type,
          tenant: { connect: { id: tenant_id } },
          products: {
            connect: products_ids.map((id) => ({ id })),
          },
          expenses: {
            connect: expenses.map((id) => ({ id })),
          },
        },
        include: { products: true },
      });

      if (pricing_type === PricingType.bulk) {
        await tx.product.updateMany({
          data: {
            quantity: createInventoryDto.quantity,
            cost_price: createInventoryDto.bulk_price,
            expected_selling_price: createInventoryDto.expected_price,
            note: createInventoryDto.note,
          },
          where: {
            id: { in: products_ids },
            tenant_id,
          },
        });
      } else if (pricing_type === PricingType.individual) {
        for (const product of individual_products) {
          await tx.product.update({
            data: {
              quantity: product.quantity,
              cost_price: createInventoryDto.cost_price,
              expected_selling_price: product.selling_price,
              serial_number: product.serial_number,
              attachments: product.attachment,
              note: product.notes,
            },
            where: { id: product.productId, tenant_id },
          });
        }
      }
      return create_inventory;
    });
  }

  // async updateInventory(
  //   inventoryId: number,
  //   data: EditInventoryDto,
  //   tenant_id: number,
  // ) {
  //   return await this.postgresService.$transaction(async (tx) => {
  //     const {
  //       products_ids,
  //       individual_products,
  //       expenses,
  //       pricing_type,
  //       ...inventoryData
  //     } = createInventoryDto;

  //     const create_inventory = await tx.inventory.create({
  //       data: {
  //         ...inventoryData,
  //         pricing_type,
  //         tenant: { connect: { id: tenant_id } },
  //         products: {
  //           connect: products_ids.map((id) => ({ id })),
  //         },
  //         expenses: {
  //           connect: expenses.map((id) => ({ id })),
  //         },
  //       },
  //       include: { products: true },
  //     });

  //     if (pricing_type === PricingType.bulk) {
  //       await tx.product.updateMany({
  //         data: {
  //           quantity: createInventoryDto.quantity,
  //           bulk_price: createInventoryDto.bulk_price,
  //           note: createInventoryDto.note,
  //           price: createInventoryDto.cost_price,
  //         },
  //         where: {
  //           id: { in: products_ids },
  //           tenant_id,
  //         },
  //       });
  //     } else if (pricing_type === PricingType.individual) {
  //       for (const product of individual_products) {
  //         await tx.product.update({
  //           data: {
  //             quantity: product.quantity,
  //             price: product.selling_price,
  //             serial_number: product.serial_number,
  //             attachments: product.attachment,
  //             note: product.notes,
  //           },
  //           where: { id: product.productId, tenant_id },
  //         });
  //       }
  //     }
  //     return create_inventory;
  //   });
  // }

  async duplicateInventory(tenant_id: number, inventoryId: number) {
    return await this.postgresService.$transaction(async (tx) => {
      const existingInventory = await tx.inventory.findUnique({
        where: { id: Number(inventoryId), tenant_id },
        include: { products: true, expenses: true },
      });

      if (!existingInventory) {
        throw new Error(`Inventory with ID ${inventoryId} not found.`);
      }
      const { id, shipping_name, ...inventory_data } = existingInventory;
      const newInventory = await tx.inventory.create({
        data: {
          shipping_name: `Copy of ${shipping_name}`,
          ...inventory_data,
          products: {
            connect: existingInventory.products.map((product) => ({
              id: product.id,
            })),
          },
          expenses: {
            connect: existingInventory.expenses.map((expense) => ({
              id: expense.id,
            })),
          },
        },
        include: { expenses: true, products: true },
      });

      return newInventory;
    });
  }

  async deleteInventory(tenant_id: number, id: number) {
    return await this.postgresService.inventory.delete({
      where: { tenant_id, id },
    });
  }

  async getDashboardStats(tenant_id: number): Promise<InventoryStatsDto> {
    const { firstDayOfLastMonth, lastDayOfLastMonth } = getLastMonthDateRange();

    // Fetch data from the database
    const inventoryStats = await this.postgresService.inventory.findMany({
      where: {
        tenant_id,
      },
      include: {
        products: {
          include: {
            categories: true,
          },
        },
      },
    });

    const inventoryStatsLastMonth =
      await this.postgresService.inventory.findMany({
        where: {
          tenant_id,
          created_at: {
            gte: firstDayOfLastMonth,
            lte: lastDayOfLastMonth,
          },
        },
        include: {
          products: {
            include: {
              categories: true,
            },
          },
        },
      });

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

    // Calculate the statistics
    const stats: InventoryStatsDto = {
      totalGoods: 0,
      goodsPercentageChange: 0,
      totalCategories: 0,
      categoriesPercentageChange: 0,
      totalReturnedProducts: 0,
      returnPercentageChange: 0,
      totalLowStocks: 0,
    };

    // Keep track of the previous month's counts
    const lastMonthStats = {
      prevMonthTotalGoods: 0,
      prevMonthTotalCategories: 0,
      prevMonthTotalReturnedProducts: 0,
    };
    // const ff = inventoryStats.map((inv) => inv.products.map((q) => q.));
    this.calculateBasicStats(inventoryStats, sales, stats);
    this.calculateLastMonthStats(
      inventoryStatsLastMonth,
      salesLastMonth,
      lastMonthStats,
    );

    // Calculate the percentage increase/decrease for each category
    stats.goodsPercentageChange = calculatePercentageChange(
      stats.totalGoods,
      lastMonthStats.prevMonthTotalGoods,
    );
    stats.categoriesPercentageChange = calculatePercentageChange(
      stats.totalCategories,
      lastMonthStats.prevMonthTotalCategories,
    );
    stats.returnPercentageChange = calculatePercentageChange(
      stats.totalReturnedProducts,
      lastMonthStats.prevMonthTotalReturnedProducts,
    );

    return stats;
  }

  private calculateBasicStats(inventoryStats, sales, stats: InventoryStatsDto) {
    // Calculate inventory-related stats
    for (const inventory of inventoryStats) {
      for (const product of inventory.products) {
        this.updateInventoryStats(product, stats);
      }
    }

    // Calculate sales-related stats
    for (const sale of sales) {
      for (const saleProduct of sale.sales_products) {
        this.updateSalesStats(saleProduct, stats);
      }
    }
  }

  private updateInventoryStats(product, stats: InventoryStatsDto) {
    stats.totalGoods += product.quantity;

    if (product.categories) {
      stats.totalCategories += product.categories.length;
    }

    if (product.quantity && product.quantity < 20) {
      stats.totalLowStocks++;
    }
  }

  private updateSalesStats(saleProduct, stats: InventoryStatsDto) {
    stats.totalReturnedProducts += saleProduct.returned_counts;
  }

  private calculateLastMonthStats(inventoryStats, sales, stats) {
    // Calculate inventory-related stats
    for (const inventory of inventoryStats) {
      for (const product of inventory.products) {
        stats.prevMonthTotalGoods += product.quantity;

        if (product.categories) {
          stats.prevMonthTotalCategories += product.categories.length;
        }
      }
    }

    // Calculate sales-related stats
    for (const sale of sales) {
      for (const saleProduct of sale.sales_products) {
        stats.prevMonthTotalReturnedProducts += saleProduct.returned_counts;
      }
    }
  }

  async getAllInventories(tenant_id: number, filters: PaginatorDTO) {
    const { skip, take } = page_generator(
      Number(filters.page),
      Number(filters.pageSize),
    );
    const filter = inventoryFilters(filters);
    const whereCondition = filter ? { tenant_id, ...filter } : { tenant_id };

    const all_inventories = await this.postgresService.product.findMany({
      where: whereCondition,
      include: { categories: true, Expense: true },
      skip,
      take,
    });

    return {
      data: all_inventories || [],
      totalCount: all_inventories.length || 0,
      pageInfo: {
        currentPage: Number(filters.page),
        perPage: Number(filters.pageSize),
        hasNextPage:
          all_inventories.length >
          Number(filters.page) * Number(filters.pageSize),
      },
    };
  }
}
