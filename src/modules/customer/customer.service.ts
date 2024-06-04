import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCustomerDto, EditCustomerDto } from './dto/customer.dto';
import { OrmService } from 'src/database/orm.service';
import { page_generator, customersFilters } from '@app/common';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';

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

  async getAllCustomers(tenant_id: number, filters: PaginatorDTO) {
    const { skip, take } = page_generator(
      Number(filters.page),
      Number(filters.pageSize),
    );
    const filter = customersFilters(filters);
    const whereCondition = filter ? { tenant_id, ...filter } : { tenant_id };

    const totalCount = await this.postgresService.customer.count({
      where: whereCondition,
    });

    const all_customers = await this.postgresService.customer.findMany({
      where: whereCondition,
      skip,
      take,
    });

    return {
      data: all_customers || [],
      totalCount,
      pageInfo: {
        currentPage: Number(filters.page),
        perPage: Number(filters.pageSize),
        hasNextPage:
          all_customers.length >
          Number(filters.page) * Number(filters.pageSize),
      },
    };
  }

  async editCustomer(tenant_id: number, id: number, data: EditCustomerDto) {
    const customer = await this.postgresService.customer.findUnique({
      where: { id, tenant_id },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    await this.postgresService.customer.update({
      where: { id, tenant_id },
      data: {
        ...data,
      },
    });

    return await this.postgresService.customer.findUnique({
      where: { id, tenant_id },
    });
  }

  async deleteCustomer(tenant_id: number, id: number) {
    return await this.postgresService.customer.delete({
      where: { tenant_id, id },
    });
  }

  async getCustomerOrderHistories(tenant_id: number, id: number) {
    const customerSales = await this.postgresService.customer.findFirst({
      where: { id, tenant_id },
      include: { sales: true },
    });
    if (!customerSales) {
      throw new NotFoundException('Customer Sales not found');
    }
    return customerSales.sales;
  }
}
