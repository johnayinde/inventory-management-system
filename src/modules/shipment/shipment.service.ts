import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateShipmentDto } from './dto/shipment.dto';
import { page_generator, shipmentFilters } from '@app/common';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';
import {
  calculateChangeInPercentage,
  ImageUploadService,
} from '@app/common/helpers';
import { getTimeRanges } from '@app/common/helpers/date-ranges';
import { ExpenseType, ProductStatusType } from '@prisma/client';

@Injectable()
export class ShipmentService {
  constructor(
    readonly postgresService: OrmService,
    readonly imageUploadService: ImageUploadService,
  ) {}
  async createShipment(
    tenant_id: number,
    data: CreateShipmentDto,
    files: Array<Express.Multer.File>,
  ) {
    const { products, price, expenses, ...details } = data;
    return await this.postgresService.$transaction(async (tx) => {
      let createdExpenses = [];

      if (expenses && expenses.length) {
        createdExpenses = await Promise.all(
          expenses.map(
            async (expense) =>
              await tx.expense.create({
                data: {
                  ...expense,
                  amount: Number(expense.amount),
                  type: ExpenseType.shipment,
                  tenant_id: tenant_id,
                  date: new Date(),
                },
              }),
          ),
        );
      }

      const foundProducts = await tx.product.findMany({
        where: {
          id: { in: products.map((id) => Number(id)) },
          tenant_id: tenant_id,
        },
        select: { id: true },
      });

      if (foundProducts.length !== products.length) {
        const foundProductIds = foundProducts.map((product) => product.id);
        const missingProductIds = products.filter(
          (id) => !foundProductIds.includes(Number(id)),
        );

        throw new BadRequestException(
          `Products with IDs ${missingProductIds.join(', ')} not found`,
        );
      }

      let image_urls: string[] = [];
      if (files && files.length) {
        image_urls = await this.imageUploadService.uploadImages(files);
      }
      const createdShipment = await tx.shipment.create({
        data: {
          ...details,
          price: Number(price),
          attachments: image_urls,
          tenant: { connect: { id: tenant_id } },
          expenses: { connect: createdExpenses.map((e) => ({ id: e.id })) },
          products: { connect: products.map((id) => ({ id: Number(id) })) },
        },
        include: { products: true, expenses: true },
      });

      return createdShipment;
    });
  }

  async getDashboardStats(
    tenant_id: number,
    time_period: 'day' | 'week' | 'month' | 'year',
  ) {
    const { current, previous } = getTimeRanges(time_period);

    const dateCondition = {
      created_at: {
        gte: current.start,
        lte: current.end,
      },
    };

    const previousDateCondition = {
      created_at: {
        gte: previous.start,
        lte: previous.end,
      },
    };

    const total_shipment_counts = await this.postgresService.shipment.count({
      where: {
        tenant_id,
        ...dateCondition,
      },
    });

    const total_shipment_counts_previous =
      await this.postgresService.shipment.count({
        where: {
          tenant_id,
          ...previousDateCondition,
        },
      });

    const inStockCount = await this.postgresService.product.count({
      where: {
        tenant_id,
        status: ProductStatusType.in_stock,
        ...dateCondition,
      },
    });

    const inStockCount_previous = await this.postgresService.product.count({
      where: {
        tenant_id,
        status: ProductStatusType.in_stock,
        ...previousDateCondition,
      },
    });

    const outOfStockCount = await this.postgresService.product.count({
      where: {
        tenant_id,
        status: ProductStatusType.sold_out,
        ...dateCondition,
      },
    });

    const outOfStockCount_previous = await this.postgresService.product.count({
      where: {
        tenant_id,
        status: ProductStatusType.sold_out,
        ...previousDateCondition,
      },
    });

    const stats = {
      total_shipments: total_shipment_counts,
      total_shipments_change: calculateChangeInPercentage(
        total_shipment_counts,
        total_shipment_counts_previous,
      ),
      in_stock: inStockCount,
      in_stock_change: calculateChangeInPercentage(
        inStockCount,
        inStockCount_previous,
      ),
      out_of_stock: outOfStockCount,
      out_of_stock_change: calculateChangeInPercentage(
        outOfStockCount,
        outOfStockCount_previous,
      ),
    };

    return stats;
  }

  async getShipment(tenant_id: number, id: number) {
    const shipment = await this.postgresService.shipment.findUnique({
      where: { id, tenant_id },
      include: {
        products: {
          select: { id: true, name: true, category: true, status: true },
        },
        expenses: true,
      },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    let formattedData = shipment.products;
    formattedData = await Promise.all(
      shipment.products.map(async (item) => {
        const report = await this.generateShipmentReport(
          id,
          item.id,
          tenant_id,
        );
        return {
          ...item,
          ...report,
        };
      }),
    );
    return { ...shipment, products: formattedData };
  }

  async getAllShipments(tenant_id: number, filters: PaginatorDTO) {
    const { skip, take } = page_generator(
      Number(filters.page),
      Number(filters.pageSize),
    );
    const filter = shipmentFilters(filters);

    const whereCondition = filter ? { tenant_id, ...filter } : { tenant_id };

    const all_sales = await this.postgresService.shipment.findMany({
      where: whereCondition,
      include: { expenses: true, products: true },
      skip,
      take,
      orderBy: { created_at: 'desc' },
    });

    const totalCount = await this.postgresService.shipment.count({
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

  async deleteFile(id: number, imageId: string, tenant_id: number) {
    const shipment = await this.postgresService.shipment.findUnique({
      where: { id, tenant_id },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment not found`);
    }

    const imageToDelete = shipment.attachments.find(
      (image) => image === imageId,
    );

    if (!imageToDelete) {
      throw new NotFoundException(`Image not found for the resource`);
    }
    const folder = process.env.AWS_S3_FOLDER;

    const key = `${folder}${imageToDelete.split('/')[4]}`;

    await this.imageUploadService.deleteImage(key);
    await this.postgresService.shipment.update({
      where: { id, tenant_id },
      data: {
        attachments: {
          set: shipment.attachments.filter((s) => s != imageToDelete),
        },
      },
    });
  }

  private async generateShipmentReport(
    shipment_id: number,
    product_id: number,
    tenant_id: number,
  ) {
    const items = await this.postgresService.inventory.findMany({
      where: { product_id, shipment_id, tenant_id },
      include: {
        product: true,
        sale_product: {
          include: {
            sale: true,
          },
        },
        expenses: true,
      },
    });

    let totalSellingPrice = 0;
    let totalQTYSold = 0;
    let totalCostPrice = 0;
    let totalExpenses = 0;

    items.forEach((inventory) => {
      totalSellingPrice += inventory.sale_product.reduce(
        (acc, saleProduct) => acc + saleProduct.total_price,
        0,
      );

      totalQTYSold += inventory.sale_product.reduce(
        (acc, saleProduct) => acc + saleProduct.quantity,
        0,
      );

      totalQTYSold += inventory.sale_product.reduce(
        (acc, saleProduct) => acc + saleProduct.quantity,
        0,
      );

      totalCostPrice +=
        inventory.cost_price *
        inventory.sale_product.reduce(
          (acc, saleProduct) => acc + saleProduct.quantity,
          0,
        );

      totalExpenses += inventory.expenses.reduce(
        (acc, expense) => acc + expense.amount,
        0,
      );
    });

    const averageSellingPrice = totalSellingPrice / totalQTYSold || 0;
    const averageCostPrice =
      (totalCostPrice + totalExpenses) / totalQTYSold || 0;

    const profitOrLoss = averageSellingPrice - averageCostPrice;
    const percentageProfit =
      profitOrLoss > 0 ? (profitOrLoss / averageCostPrice) * 100 : 0;
    const percentageLoss =
      profitOrLoss < 0 ? (Math.abs(profitOrLoss) / averageCostPrice) * 100 : 0;

    return {
      totalQtySold: totalQTYSold,
      averageSellingPrice: averageSellingPrice.toFixed(2),
      averageCostPrice: averageCostPrice.toFixed(2),
      percentageProfit: percentageProfit.toFixed(2),
      percentageLoss: percentageLoss.toFixed(2),
    };
  }
}
