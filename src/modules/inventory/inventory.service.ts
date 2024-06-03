import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateInventoryDto, EditInventoryDto } from './dto/inventory.dto';
import { PricingType, PrismaClient } from '@prisma/client';
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
      const { inventories } = createInventoryDto;
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId, tenant_id },
        include: { products: true, expenses: true },
      });

      if (!shipment) {
        throw new NotFoundException('Shipment not found');
      }
      if (shipment.is_in_inventory) {
        throw new NotFoundException('Shipment items already in Inventory.');
      }

      const shippedProductIds = shipment.products.map((i) => i.id);
      const mappedProduct = shipment.products.reduce(
        (i, item) => ({ ...i, [item.id]: item }),
        {},
      );

      for (const item of inventories) {
        const { pid, pricing_type, quantity } = item;

        const prodIdPrefix = `PRD${shipment.id}${pid}${tenant_id}`;
        const prodId = `${prodIdPrefix}-${uuidv4().split('-')[2]}`;

        if (pricing_type === PricingType.bulk) {
          if (shippedProductIds.includes(parseInt(pid))) {
            const inventory = await tx.inventory.create({
              data: {
                prod_id: prodId,
                pricing_type: PricingType.bulk,
                price: item.price,
                note: item.note,
                quantity: Number(quantity),
                name: mappedProduct[pid].name,

                tenant: { connect: { id: tenant_id } },
                shipment: { connect: { id: shipmentId } },
                product: { connect: { id: parseInt(pid) } },
              },
              include: { product: true },
            });

            await this.getTotalQuantityByProduct(
              tx as PrismaClient,
              tenant_id,
              inventory,
            );
          } else {
            throw new NotFoundException(
              `Product with ID ${pid} not in shipped items`,
            );
          }
        } else if (pricing_type === PricingType.individual) {
          if (quantity !== item.individual_items.length) {
            throw new BadRequestException(
              `Expecting ${quantity} individual items for ${mappedProduct[pid].name}`,
            );
          }

          if (shippedProductIds.includes(parseInt(pid))) {
            for (const individual_item of item.individual_items) {
              const prodIdPrefix = `PRD${shipment.id}${pid}${tenant_id}`;
              const prodId = `${prodIdPrefix}-${uuidv4().split('-')[2]}`;
              const inventory = await tx.inventory.create({
                data: {
                  ...individual_item,
                  prod_id: prodId,
                  pricing_type: PricingType.individual,
                  quantity: 1,

                  tenant: { connect: { id: tenant_id } },
                  shipment: { connect: { id: shipmentId } },
                  product: { connect: { id: parseInt(pid) } },
                },
                include: { product: true },
              });

              await this.getTotalQuantityByProduct(
                tx as PrismaClient,
                tenant_id,
                inventory,
              );
            }
          } else {
            throw new NotFoundException(
              `${mappedProduct[pid].name} not in shipped items`,
            );
          }
        }
      }
      await tx.shipment.update({
        where: { id: shipmentId, tenant_id },
        data: { is_in_inventory: true },
      });
      return 'Inventories creaded successfully';
    });
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
        price: true,
      },
      _max: {
        price: true,
      },
    });

    console.log(inventorySummary);

    const total_qty = inventorySummary?.[0]?._sum?.quantity ?? 0;
    const min_price = inventorySummary?.[0]?._min?.price ?? 0;
    const max_price = inventorySummary?.[0]?._max?.price ?? 0;

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

  async updateInventory(id: number, data: EditInventoryDto, tenant_id: number) {
    return await this.postgresService.$transaction(async (tx) => {
      await tx.inventory.update({
        data,
        where: { id, tenant_id },
      });

      const inventory = await tx.inventory.findFirst({
        where: { id, tenant_id },
        include: { product: true },
      });

      if (data?.quantity != undefined || data?.price) {
        await this.getTotalQuantityByProduct(
          tx as PrismaClient,
          tenant_id,
          inventory,
        );
      }

      return await tx.inventory.findFirst({
        where: { id, tenant_id },
        include: { product: { include: { category: true } } },
      });
    });
  }

  async getInventory(tenant_id: number, id: number) {
    const inventory = await this.postgresService.inventory.findUnique({
      where: { id, tenant_id },
      include: { product: { include: { category: true } } },
    });
    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }
    return inventory;
  }

  // out of Endpoint for now
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

      const newInventory = await tx.inventory.create({
        data: {
          ...inventory_data,
          prod_id: prodId,
          name: `Duplicate ${existingInventory.name}`,
          tenant: { connect: { id: tenant_id } },
          shipment: { connect: { id: shipment_id } },
          product: { connect: { id: product_id } },
        },
        include: { product: { include: { category: true } } },
      });

      return newInventory;
    });
  }

  async deleteInventory(tenant_id: number, id: number) {
    return await this.postgresService.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { id, tenant_id },
        include: { product: true },
      });
      if (!inventory) {
        throw new NotFoundException('Inventory not found');
      }
      await this.getTotalQuantityByProduct(
        tx as PrismaClient,
        tenant_id,
        inventory,
      );

      await tx.inventory.delete({
        where: { tenant_id, id },
      });
    });
  }

  async getDashboardStats(tenant_id: number): Promise<InventoryStatsDto> {
    const { firstDayOfLastMonth, lastDayOfLastMonth } = getLastMonthDateRange();

    // Fetch data from the database
    const productStats = await this.postgresService.product.count({
      where: {
        tenant_id,
        status: 'running_low',
      },
    });
    const inventoryStats = await this.postgresService.inventory.count({
      where: {
        tenant_id,
      },
    });

    const inventoryStatsLastMonth = await this.postgresService.inventory.count({
      where: {
        tenant_id,
        created_at: {
          gte: firstDayOfLastMonth,
          lte: lastDayOfLastMonth,
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

    const allcategoroes = await this.postgresService.category.count({
      where: {
        tenant_id,
      },
    });

    // Calculate the statistics
    const stats: InventoryStatsDto = {
      totalGoods: 0,
      totalLowStocks: 0,
      totalCategories: 0,
      totalReturnedProducts: 0,
      prevMonthTotalGoods: 0,
      goodsPercentageChange: 0,
      //
      categoriesPercentageChange: 0,
      returnPercentageChange: 0,
    };

    stats.totalGoods = inventoryStats;
    stats.totalLowStocks = productStats;
    stats.totalCategories = allcategoroes;
    stats.prevMonthTotalGoods = inventoryStatsLastMonth;
    stats.goodsPercentageChange = calculatePercentageChange(
      stats.totalGoods,
      stats.prevMonthTotalGoods,
    );
    for (const sale of sales) {
      for (const saleProduct of sale.sales_products) {
        stats.totalReturnedProducts += saleProduct.returned_counts;
      }
    }

    return stats;
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
      include: { product: { include: { category: true } } },
      skip,
      take,
    });

    const totalCount = await this.postgresService.inventory.count({
      where: whereCondition,
    });
    return {
      data: all_inventories || [],
      totalCount,
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
