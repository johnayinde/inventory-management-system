import { calculate_date_range } from '@app/common/helpers';
import { Injectable } from '@nestjs/common';
import { NotifierType, ProductStatusType } from '@prisma/client';
import { OrmService } from 'src/database/orm.service';
import { NotificationConfigDto } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly postgresService: OrmService) {}

  async setNotificationConfigs(tenant_id: number, data: NotificationConfigDto) {
    return await this.postgresService.notification.upsert({
      where: { tenant_id },
      create: { ...data, tenant: { connect: { id: tenant_id } } },
      update: { ...data },
    });
  }

  async topSellingProducts() {
    const tenants = await this.postgresService.notification.findMany({
      where: { top_selling_notifier: true },
    });

    for (const { id: tenant_id } of tenants) {
      const { start, end } = calculate_date_range(1);
      const allSaleProducts = await this.postgresService.saleProduct.findMany({
        where: {
          tenant_id,
          sale: { tenant_id },
          created_at: {
            gte: start,
            lte: end,
          },
        },
        include: { inventory_item: { include: { product: true } } },
        orderBy: { total_price: 'desc' },
        take: 3,
      });

      const topSellingProducts = allSaleProducts.map(async (saleProduct) => {
        if (saleProduct.total_price <= 0) return;
        return {
          product_name: saleProduct.inventory_item.name,
          revenue: saleProduct.total_price || 0,
          quantity: saleProduct.quantity || 0,
        };
      });

      if (topSellingProducts.length) {
        await this.postgresService.log.createMany({
          data: {
            ...topSellingProducts,
            tenant_id,
            type: NotifierType.top_selling,
          },
        });
      }
    }
  }

  async lowStocks() {
    const tenants = await this.postgresService.notification.findMany({
      where: { low_stock_notifier: true },
    });

    for (const { id: tenant_id } of tenants) {
      const { start, end } = calculate_date_range(1);
      const lowStocks = await this.postgresService.product.findMany({
        where: {
          tenant_id,
          status: ProductStatusType.running_low,
          created_at: {
            gte: start,
            lte: end,
          },
        },
        take: 5,
      });

      const topSellingProducts = lowStocks.map(async (product) => {
        return {
          product_name: product.name,
        };
      });

      if (topSellingProducts.length) {
        await this.postgresService.log.createMany({
          data: {
            ...topSellingProducts,
            tenant_id,
            type: NotifierType.low_stock,
          },
        });
      }
    }
  }

  async soldOutStocks() {
    const tenants = await this.postgresService.notification.findMany({
      where: { sold_out_notifier: true },
    });

    for (const { id: tenant_id } of tenants) {
      const { start, end } = calculate_date_range(1);
      const soleOutStocks = await this.postgresService.product.findMany({
        where: {
          tenant_id,
          status: ProductStatusType.sold_out,
          created_at: {
            gte: start,
            lte: end,
          },
        },
        take: 5,
      });

      const soldOutProducts = soleOutStocks.map(async (product) => {
        return {
          product_name: product.name,
        };
      });

      if (soldOutProducts.length) {
        await this.postgresService.log.createMany({
          data: {
            ...soldOutProducts,
            tenant_id,
            type: NotifierType.sold_out,
          },
        });
      }
    }
  }

  // TODO: improve notification deletion
  async clearOldNotifications() {
    const { start } = calculate_date_range(7);

    // Delete notifications older than 7days (records created before the last 7days)
    await this.postgresService.log.deleteMany({
      where: {
        created_at: {
          lt: start,
        },
      },
    });
  }

  async getAllNotification(tenant_id: number) {
    return await this.postgresService.log.findMany({
      where: { tenant_id },
    });
  }

  async delete(tenant_id: number, id: number) {
    await this.postgresService.log.delete({
      where: { id, tenant_id },
    });
  }
}
