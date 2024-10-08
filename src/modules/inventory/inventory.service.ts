import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateInventoryDto, EditInventoryDto } from './dto/inventory.dto';
import { PricingType, PrismaClient, ProductStatusType } from '@prisma/client';
import {
  calculateChangeInPercentage,
  determineProductStatus,
  ImageUploadService,
} from '@app/common/helpers';
import {
  InventoryStatsDto,
  inventoryFilters,
  page_generator,
} from '@app/common';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';
import { v4 as uuidv4 } from 'uuid';
import { getTimeRanges } from '@app/common/helpers/date-ranges';

@Injectable()
export class InventoryService {
  constructor(
    private readonly postgresService: OrmService,
    readonly imageUploadService: ImageUploadService,
  ) {}

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

      const shippedProductIds = new Set(shipment.products.map((i) => i.id));
      const mappedProduct = shipment.products.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});

      const bulkInventories = [];
      const individualInventories = [];

      for (const item of inventories) {
        const { pid, pricing_type, quantity, individual_items, attachments } =
          item;

        const parsedPid = parseInt(pid);

        if (!shippedProductIds.has(parsedPid)) {
          throw new NotFoundException(
            `Product with ID ${pid} not in shipped items`,
          );
        }
        const prodIdPrefix = `PRD${shipment.id}${pid}${tenant_id}`;
        const prodId = `${prodIdPrefix}-${uuidv4().split('-')[2]}`;

        if (pricing_type === PricingType.bulk) {
          let image_urls: string[] = [];
          if (attachments && attachments.length) {
            const decodedFiles =
              await this.imageUploadService.decodeBase64Images(
                attachments || [],
              );
            image_urls = await this.imageUploadService.uploadImages(
              decodedFiles,
            );
          }

          bulkInventories.push({
            prod_id: prodId,
            pricing_type: PricingType.bulk,
            cost_price: item.cost_price,
            selling_price: item.selling_price,
            note: item.note,
            quantity: Number(quantity),
            name: mappedProduct[pid].name,
            tenant_id,
            shipment_id: shipmentId,
            product_id: parsedPid,
            attachments: image_urls,
          });
        } else if (pricing_type === PricingType.individual) {
          if (quantity !== individual_items.length) {
            throw new BadRequestException(
              `Expecting ${quantity} individual items for ${mappedProduct[pid].name}`,
            );
          }

          for (const individual_item of individual_items) {
            const { attachments } = individual_item;
            const individualProdId = `${prodIdPrefix}-${
              uuidv4().split('-')[2]
            }`;

            let image_urls: string[] = [];
            if (attachments && attachments.length) {
              const decodedFiles =
                await this.imageUploadService.decodeBase64Images(
                  attachments || [],
                );
              image_urls = await this.imageUploadService.uploadImages(
                decodedFiles,
              );
            }

            individualInventories.push({
              ...individual_item,
              prod_id: individualProdId,
              pricing_type: PricingType.individual,
              quantity: 1,
              tenant_id,
              shipment_id: shipmentId,
              product_id: parsedPid,
              attachments: image_urls,
            });
          }
        }
      }

      // Batch create bulk inventories
      if (bulkInventories.length > 0) {
        const createdBulkCount = await tx.inventory.createMany({
          data: bulkInventories,
        });

        // Fetch and update the created bulk inventories
        const createdBulkInventories = await tx.inventory.findMany({
          where: {
            prod_id: {
              in: bulkInventories.map((inv) => inv.prod_id),
            },
            tenant_id,
          },
          include: { product: true },
        });

        for (const inventory of createdBulkInventories) {
          await this.getTotalQuantityByProduct(
            tx as PrismaClient,
            tenant_id,
            inventory,
          );
        }
      }

      // Batch create individual inventories
      if (individualInventories.length > 0) {
        const createdIndividualCount = await tx.inventory.createMany({
          data: individualInventories,
        });

        // Fetch and update the created individual inventories
        const createdIndividualInventories = await tx.inventory.findMany({
          where: {
            prod_id: {
              in: individualInventories.map((inv) => inv.prod_id),
            },
            tenant_id,
          },
          include: { product: true },
        });

        for (const inventory of createdIndividualInventories) {
          await this.getTotalQuantityByProduct(
            tx as PrismaClient,
            tenant_id,
            inventory,
          );
        }
      }

      await tx.shipment.update({
        where: { id: shipmentId, tenant_id },
        data: { is_in_inventory: true },
      });
      return 'Inventories created successfully';
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
        selling_price: true,
      },
      _max: {
        selling_price: true,
      },
    });

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

      if (data?.quantity != undefined || data?.selling_price) {
        await this.getTotalQuantityByProduct(
          tx as PrismaClient,
          tenant_id,
          inventory,
        );
      }

      return inventory;
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
    const totalgoods = await this.postgresService.inventory.aggregate({
      where: {
        tenant_id,
      },
      _sum: { quantity: true },
    });

    const runningLow_products = await this.postgresService.product.count({
      where: {
        tenant_id,
        status: ProductStatusType.running_low,
      },
    });

    const damagedCount = await this.postgresService.inventory.aggregate({
      where: {
        tenant_id,
      },
      _sum: { damaged_counts: true },
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
      totalDamagedProducts: 0,
      goodsPercentageChange: 0,
      totalLowStocksPercentChange: 0,
      categoriesPercentageChange: 0,
      damagedPercentageChange: 0,
    };

    stats.totalGoods = totalgoods._sum.quantity;
    stats.totalCategories = allcategoroes;
    stats.totalDamagedProducts = damagedCount._sum.damaged_counts;
    stats.totalLowStocks = runningLow_products;

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
      orderBy: { created_at: 'desc' },
    });

    const totalCount = await this.postgresService.inventory.count({
      where: { tenant_id },
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

  async markItemAsDamaged(id: number, quantity: number, tenant_id: number) {
    return await this.postgresService.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { id, tenant_id },
        include: { product: true },
      });

      if (!inventory) {
        throw new NotFoundException('Inventory not found');
      }

      if (quantity > inventory.quantity) {
        throw new BadRequestException(`Invalid quantity for inventory`);
      }

      await tx.inventory.update({
        where: { id, tenant_id },
        data: {
          quantity: {
            decrement: quantity,
          },
          damaged_counts: {
            increment: quantity,
          },
        },
      });

      await tx.archive.create({
        data: {
          quantity,
          tenant: { connect: { id: tenant_id } },
          inventory: { connect: { id } },
        },
      });

      await this.getTotalQuantityByProduct(
        tx as PrismaClient,
        tenant_id,
        inventory,
      );
      return await tx.inventory.findUnique({ where: { id, tenant_id } });
    });
  }
}
