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
import { SaleService } from './sale.service';
import { TenantInterceptor } from '@app/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { CreateSaleDto } from './dto/sales.dto';
import { Request } from 'express';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';

@ApiTags('Sales')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('sales')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Post('')
  @ApiBody({
    description: 'Create Customer Sales',
    type: CreateSaleDto,
  })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createSalesDto: CreateSaleDto, @Req() { tenant_id }: Request) {
    return this.saleService.createCustomerSales(createSalesDto, tenant_id);
  }

  @Get('/sales-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  getStats(@Req() { tenant_id }: Request, @Query('time_period') time_period) {
    return this.saleService.getSalesStats(tenant_id, time_period);
  }
  @Get('/top-selling')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  topSellingProductsSats(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.saleService.getTopSellingProductsStats(tenant_id, time_period);
  }

  @Get('least-selling')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  leastSellingProductsSats(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.saleService.getLeastSellingProductStats(tenant_id, time_period);
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  getAllSales(@Req() { tenant_id }: Request, @Query() filters: PaginatorDTO) {
    return this.saleService.getAllSales(tenant_id, filters);
  }

  @Get('/invoice/:salesId')
  @HttpCode(HttpStatus.OK)
  getInvoice(
    @Req() { tenant_id }: Request,
    @Param('salesId', ParseIntPipe) salesId: number,
  ) {
    return this.saleService.getInvoice(tenant_id, salesId);
  }

  @Post('products/return/:saleId/:productId/:quantity')
  @HttpCode(HttpStatus.CREATED)
  async returnProductItem(
    @Param('saleId', ParseIntPipe) saleId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Param('quantity', ParseIntPipe) quantity: number,
    @Req() { tenant_id }: Request,
  ) {
    return this.saleService.returnProductItem(
      saleId,
      productId,
      quantity,
      tenant_id,
    );
  }

  @Post('products/damage/:saleId/:productId/:quantity')
  @HttpCode(HttpStatus.CREATED)
  async markProductAsDamaged(
    @Param('saleId', ParseIntPipe) saleId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Param('quantity', ParseIntPipe) quantity: number,
    @Req() { tenant_id }: Request,
  ) {
    return this.saleService.markProductAsDamaged(
      saleId,
      productId,
      quantity,
      tenant_id,
    );
  }

  @Patch('/products/:saleId/:saleItemId/:quantity/edit')
  @HttpCode(HttpStatus.OK)
  async editSaleItem(
    @Param('saleId', ParseIntPipe) saleId: number,
    @Param('saleItemId', ParseIntPipe) saleItemId: number,
    @Param('quantity', ParseIntPipe) quantity: number,
    @Req() { tenant_id }: Request,
  ) {
    return this.saleService.editSaleProductQuantity(
      tenant_id,
      saleId,
      saleItemId,
      quantity,
    );
  }

  @Post('products/:saleId/:saleItemId/duplicate')
  @HttpCode(HttpStatus.CREATED)
  duplicateSalesItem(
    @Param('saleId', ParseIntPipe) saleId: number,
    @Param('saleItemId', ParseIntPipe) saleItemId: number,
    @Req() { tenant_id }: Request,
  ) {
    return this.saleService.duplicateSalesItem(tenant_id, saleId, saleItemId);
  }

  @Delete(':salesId')
  @HttpCode(HttpStatus.OK)
  deleteSales(
    @Req() { tenant_id }: Request,
    @Param('salesId', ParseIntPipe) salesId: number,
  ) {
    return this.saleService.deleteSale(tenant_id, salesId);
  }

  @Delete('/products/:saleItemId')
  @HttpCode(HttpStatus.OK)
  deleteSalesProduct(
    @Req() { tenant_id }: Request,
    @Param('saleItemId', ParseIntPipe) saleItemId: number,
  ) {
    return this.saleService.deleteSaleItem(tenant_id, saleItemId);
  }
}
