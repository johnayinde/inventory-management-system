import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCustomerDto, EditCustomerDto } from './dto/customer.dto';
import { OrmService } from 'src/database/orm.service';

@Injectable()
export class CustomerService {
  constructor(private readonly postgresService: OrmService) {}

  async createCustomer(tenant_id: number, customer: CreateCustomerDto) {
    return await this.postgresService.customer.create({
      data: {
        email: customer.email,
        name: customer.name,
        address: customer.address,
        phone_number: customer.phone_number,
        tenant: { connect: { id: tenant_id } },
      },
    });
  }

  async getAllCustomers(tenant_id: number) {
    return await this.postgresService.customer.findMany({
      where: { tenant_id },
    });
  }

  async editCustomer(tenant_id: number, id: number, data: EditCustomerDto) {
    const customer = await this.postgresService.customer.findUnique({
      where: { id: Number(id), tenant_id },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    await this.postgresService.customer.update({
      where: { id: Number(id), tenant_id },
      data: {
        ...data,
      },
    });
    return 'Customer Updated!';
  }

  async deleteCustomer(tenant_id: number, customerID: number) {
    return await this.postgresService.customer.delete({
      where: { tenant_id, id: Number(customerID) },
    });
  }

  //   async getOrders(tenant_id: number, productId: number) {
  //       const product = await this.postgresService.product.findUnique({
  //         where: { id: Number(productId), tenant_id },
  //         include: { categories: true },
  //       });
  //       if (!product) {
  //         throw new NotFoundException('Product not found');
  //       }
  //       return product;
  //
  //   }
}
