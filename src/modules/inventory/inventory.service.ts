import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateInventoryDto, EditInventoryDto } from './dto/inventory.dto';
import { PricingType, ProductStatusType } from '@prisma/client';
import {
  calculatePercentageChange,
  determineProductStatus,
  getLastMonthDateRange,
} from '@app/common/helpers';
import {
  InventoryStatsDto,
  inventoryFilters,
  page_generator,
} from '@app/common';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InventoryService {
  constructor(private readonly postgresService: OrmService) {}

  async create(
    createInventoryDto: CreateInventoryDto,
    tenant_id: number,
    shipmentId: number,
  ) {
    return await this.postgresService.$transaction(async (tx) => {
      const { products } = createInventoryDto;
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId, tenant_id },
        include: { products: true, expenses: true },
      });

      console.log({ shipment });

      if (!shipment) {
        throw new NotFoundException('Shipment not found');
      }

      const shippedProductIds = shipment.products.map((i) => i.id);
      const mappedProduct = shipment.products.reduce(
        (i, j) => ({ ...i, [j.id]: j.name }),
        {},
      );

      for (const [productId, productDetails] of Object.entries(products)) {
        const { individual_pricing, pricing_type, quantity, bulk_pricing } =
          productDetails;

        const prodIdPrefix = `#PRD${shipment.id}${productId}${tenant_id}`;
        const prodId = `${prodIdPrefix}-${uuidv4().split('-')[2]}`;

        if (pricing_type === PricingType.bulk) {
          if (shippedProductIds.includes(parseInt(productId))) {
            console.log('init');

            const created_inventory = await tx.inventory.create({
              data: {
                prod_id: prodId,
                pricing_type: PricingType.bulk,
                price: bulk_pricing.price,
                note: bulk_pricing.note,
                quantity_threshold: bulk_pricing.quantity_threshold,
                quantity: quantity,
                name: mappedProduct[productId],

                tenant: { connect: { id: tenant_id } },
                shipment: { connect: { id: shipmentId } },
                product: { connect: { id: parseInt(productId) } },
              },
              include: { product: true },
            });

            console.log({ created_inventory });

            const threshold = created_inventory.quantity_threshold;
            const prod_qty = created_inventory.quantity;
            console.log({ threshold, prod_qty });

            await tx.inventory.update({
              where: { id: created_inventory.id, tenant_id },
              data: {
                status: determineProductStatus(prod_qty, threshold),
              },
            });
          } else {
            throw new NotFoundException(
              `Product with ID ${productId} not in shipped items`,
            );
          }
        } else if (pricing_type === PricingType.individual) {
          if (quantity !== individual_pricing.length) {
            throw new BadRequestException(
              `Expecting ${quantity} individual items for ${mappedProduct[productId]}`,
            );
          }

          if (shippedProductIds.includes(parseInt(productId))) {
            for (const item of individual_pricing) {
              const prodIdPrefix = `#PRD$${productId}${tenant_id}`;
              const prodId = `${prodIdPrefix}-${uuidv4().split('-')[2]}`;
              await tx.inventory.create({
                data: {
                  prod_id: prodId,
                  name: item.name,
                  price: item.price,
                  note: item.note,
                  pricing_type: PricingType.individual,
                  quantity_threshold: 1,
                  quantity: 1,
                  status: 'running_low',

                  tenant: { connect: { id: tenant_id } },
                  shipment: { connect: { id: shipmentId } },
                  product: { connect: { id: parseInt(productId) } },
                },
                include: { product: true },
              });
            }
          } else {
            throw new NotFoundException(
              `${mappedProduct[productId]} not in shipped items`,
            );
          }
        }
      }
    });
  }

  async updateInventory(id: number, data: EditInventoryDto, tenant_id: number) {
    await this.postgresService.inventory.update({
      data,
      where: { id, tenant_id },
    });
    const inventory = await this.postgresService.inventory.findFirst({
      where: { id, tenant_id },
    });
    const threshold = inventory.quantity_threshold;
    const prod_qty = inventory.quantity;
    console.log({ threshold, prod_qty });

    await this.postgresService.inventory.update({
      where: { id: inventory.id, tenant_id },
      data: {
        status: determineProductStatus(prod_qty, threshold),
      },
    });
  }

  async getInventory(tenant_id: number, id: number) {
    const inventory = await this.postgresService.inventory.findUnique({
      where: { id, tenant_id },
      include: { product: true },
    });
    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }
    return inventory;
  }

  async duplicateInventory(tenant_id: number, inventoryId: number) {
    return await this.postgresService.$transaction(async (tx) => {
      const existingInventory = await tx.inventory.findUnique({
        where: { id: inventoryId, tenant_id },
        include: { product: true },
      });

      if (!existingInventory) {
        throw new Error(`Inventory with ID ${inventoryId} not found.`);
      }
      const {
        id,
        created_at,
        updated_at,
        tenant_id: t,
        product_id,
        shipment_id,
        product,
        ...inventory_data
      } = existingInventory;

      const prodIdPrefix = `#PRD${shipment_id}${product_id}${tenant_id}`;
      const prodId = `${prodIdPrefix}-${uuidv4().split('-')[2]}`;
      console.log(existingInventory);

      const newInventory = await tx.inventory.create({
        data: {
          ...inventory_data,
          prod_id: prodId,
          name: `Duplicate ${existingInventory.name}`,
          tenant: { connect: { id: tenant_id } },
          shipment: { connect: { id: shipment_id } },
          product: { connect: { id: product_id } },
        },
        include: { product: true },
      });
      console.log({ newInventory });

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
        product: {
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
          product: {
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
            inventory_item: true,
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
            inventory_item: true,
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
    //

    //
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
    stats.totalGoods = inventoryStats.length;

    for (const inventory_item of inventoryStats) {
      this.updateInventoryStats(inventory_item, stats);
    }

    for (const sale of sales) {
      for (const saleProduct of sale.sales_products) {
        this.updateSalesStats(saleProduct, stats);
      }
    }
  }

  private updateInventoryStats(inventory_item, stats: InventoryStatsDto) {
    if (inventory_item.product.categories) {
      stats.totalCategories += inventory_item.product.categories.length;
    }
    if (inventory_item.status === ProductStatusType.running_low) {
      stats.totalLowStocks++;
    }
  }

  private updateSalesStats(saleProduct, stats: InventoryStatsDto) {
    stats.totalReturnedProducts += saleProduct.returned_counts;
  }

  private calculateLastMonthStats(inventoryStats, sales, stats) {
    stats.prevMonthTotalGoods = inventoryStats.length;

    for (const inventory_item of inventoryStats) {
      if (inventory_item.product.categories) {
        stats.prevMonthTotalCategories +=
          inventory_item.product.categories.length;
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

    const all_inventories = await this.postgresService.inventory.findMany({
      where: whereCondition,
      include: { product: true },
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
