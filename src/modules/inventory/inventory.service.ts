import { Injectable } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateInventoryDto } from './dto/inventory.dto';
import { PricingType } from '@prisma/client';

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
}
