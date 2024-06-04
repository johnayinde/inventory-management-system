import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { Role, Roles, TenantInterceptor } from '@app/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CreateCustomerDto, EditCustomerDto } from './dto/customer.dto';
import { Request } from 'express';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';

@ApiTags('Customer')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Roles(Role.Customers)
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post('')
  @ApiBody({
    description: 'Create Customer',
    type: CreateCustomerDto,
  })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() data: CreateCustomerDto, @Req() { tenant_id }: Request) {
    return this.customerService.createCustomer(tenant_id, data);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getCategories(@Req() { tenant_id }: Request, @Query() filters: PaginatorDTO) {
    return this.customerService.getAllCustomers(tenant_id, filters);
  }

  @Get('/:customerId/orders')
  @HttpCode(HttpStatus.OK)
  customerSales(
    @Req() { tenant_id }: Request,
    @Param('customerId', ParseIntPipe) customerId: number,
  ) {
    return this.customerService.getCustomerOrderHistories(
      tenant_id,
      customerId,
    );
  }

  @Patch(':customerId')
  @ApiBody({
    description: 'Edit Customer',
    type: EditCustomerDto,
  })
  @HttpCode(HttpStatus.OK)
  async editExpense(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() body: EditCustomerDto,
    @Req() { tenant_id }: Request,
  ) {
    return this.customerService.editCustomer(tenant_id, customerId, body);
  }

  @Delete('/:customerId')
  @HttpCode(HttpStatus.OK)
  delete(
    @Req() { tenant_id }: Request,
    @Param('customerId', ParseIntPipe) customerId: number,
  ) {
    return this.customerService.deleteCustomer(tenant_id, customerId);
  }
}
