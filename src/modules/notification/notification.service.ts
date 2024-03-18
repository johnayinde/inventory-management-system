import { calculate_date_range } from '@app/common/helpers';
import { Injectable } from '@nestjs/common';
import { NotifierType } from '@prisma/client';
import { OrmService } from 'src/database/orm.service';

@Injectable()
export class NotificationService {
  constructor(private readonly postgresService: OrmService) {}

  async aggregateTopSellingProducts() {
    const tenants = await this.postgresService.tenant.findMany({
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

      const topSellingProducts = await Promise.all(
        allSaleProducts.map(async (saleProduct) => {
          if (saleProduct.total_price <= 0) return;
          return {
            product: saleProduct.inventory_item.name,
            revenue: saleProduct.total_price || 0,
            quantity: saleProduct.quantity || 0,
          };
        }),
      );

      if (topSellingProducts.length) {
        await this.postgresService.notification.create({
          data: {
            tenant_id,
            type: NotifierType.top_selling,
            products: topSellingProducts,
          },
        });
      }
    }
  }

  async clearOldNotifications() {
    const { start } = calculate_date_range(7);

    // Delete notifications older than 7days (records created before the last 7days)
    await this.postgresService.notification.deleteMany({
      where: {
        created_at: {
          lt: start,
        },
      },
    });
  }
  async getAllNotification(tenant_id: number) {
    return await this.postgresService.notification.findMany({
      where: { tenant_id: tenant_id },
    });
  }

  async delete(tenant_id: number, id: number) {
    await this.postgresService.notification.delete({
      where: { id, tenant_id },
    });
  }
}
