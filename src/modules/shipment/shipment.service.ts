import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateShipmentDto } from './dto/shipment.dto';
import { page_generator, shipmentFilters } from '@app/common';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';
import { deleteImage, uploadImages } from '@app/common/helpers';

@Injectable()
export class ShipmentService {
  constructor(readonly postgresService: OrmService) {}
  async createShipment(
    tenant_id: number,
    data: CreateShipmentDto,
    files: Array<Express.Multer.File>,
  ) {
    const { products, expenses, ...details } = data;
    return await this.postgresService.$transaction(
      async (tx) => {
        const createdExpenses = [];

        if (expenses && expenses.length) {
          // Create expenses one after the other
          for (const expenseData of expenses) {
            const createdExpense = await tx.expense.create({
              data: {
                ...expenseData,
                amount: Number(expenseData.amount),
                type: 'shipment',
                tenant: { connect: { id: tenant_id } },
                date: new Date(),
              },
            });

            createdExpenses.push(createdExpense);
          }
        }

        for (const productId of products) {
          const product = await tx.product.findUnique({
            where: { id: productId, tenant_id },
          });

          if (!product) {
            throw new BadRequestException(
              `Product with ID ${productId} not found`,
            );
          }
        }
        let image_urls: string[] = [];

        if (files && files.length) {
          const folder = process.env.AWS_S3_FOLDER;
          image_urls = await uploadImages(files, folder);
        }
        const createdShipment = await tx.shipment.create({
          data: {
            ...details,
            attachments: image_urls,
            tenant: { connect: { id: tenant_id } },
            expenses: { connect: createdExpenses.map((e) => ({ id: e.id })) },
            products: { connect: products.map((id) => ({ id: Number(id) })) },
          },
          include: { products: true, expenses: true },
        });

        return createdShipment;
      },
      { timeout: 10000 },
    );
  }

  async getShipment(tenant_id: number, id: number) {
    const shipment = await this.postgresService.shipment.findUnique({
      where: { id, tenant_id },
      include: { products: { include: { category: true } }, expenses: true },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    return shipment;
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
      include: { expenses: true },
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

    await deleteImage(key);
    await this.postgresService.shipment.update({
      where: { id, tenant_id },
      data: {
        attachments: {
          set: shipment.attachments.filter((s) => s != imageToDelete),
        },
      },
    });
  }
}
