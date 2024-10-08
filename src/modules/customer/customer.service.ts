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
        ...customer,
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
      where: { tenant_id },
    });

    const all_customers = await this.postgresService.customer.findMany({
      where: whereCondition,
      skip,
      take,
      orderBy: { created_at: 'desc' },
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

  async getCustomerOrderHistories(
    tenant_id: number,
    id: number,
    filters: PaginatorDTO,
  ) {
    const { skip, take } = page_generator(
      Number(filters.page),
      Number(filters.pageSize),
    );
    const filter = customersFilters(filters);
    const whereCondition = filter
      ? { tenant_id, ...filter }
      : { tenant_id, customerId: id };

    const customer = await this.postgresService.customer.findUnique({
      where: { id, tenant_id },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const customerSales = await this.postgresService.sale.findMany({
      where: whereCondition,
      include: { customer: true },
      skip,
      take,
      orderBy: { created_at: 'desc' },
    });
    if (!customerSales) {
      throw new NotFoundException('Customer Sales not found');
    }

    const totalCount = await this.postgresService.sale.count({
      where: { tenant_id, customerId: id },
    });

    return {
      data: { customer, sales: customerSales },
      totalCount,
      pageInfo: {
        currentPage: Number(filters.page),
        perPage: Number(filters.pageSize),
        hasNextPage:
          customerSales.length >
          Number(filters.page) * Number(filters.pageSize),
      },
    };
  }
}
