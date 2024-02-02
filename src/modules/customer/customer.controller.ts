import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { TenantInterceptor } from '@app/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CreateCustomerDto, EditCustomerDto } from './dto/customer.dto';
import { Request } from 'express';

@ApiTags('Customer')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
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
  getCategories(@Req() { tenant_id }: Request) {
    return this.customerService.getAllCustomers(tenant_id);
  }

  @Patch(':customerId')
  @ApiBody({
    description: 'Edit Customer',
    type: EditCustomerDto,
  })
  @HttpCode(HttpStatus.OK)
  async editExpense(
    @Param('customerId') customerId: number,
    @Body() body: EditCustomerDto,
    @Req() { tenant_id }: Request,
  ) {
    return this.customerService.editCustomer(tenant_id, customerId, body);
  }

  @Delete('/:customerId')
  @HttpCode(HttpStatus.OK)
  delete(
    @Req() { tenant_id }: Request,
    @Param('customerId') customerId: number,
  ) {
    return this.customerService.deleteCustomer(tenant_id, customerId);
  }
}
