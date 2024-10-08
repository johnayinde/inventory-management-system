import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductoDto, EditProductDto } from './dto/product.dto';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { TenantInterceptor } from '@app/common';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';

import { ApiFile } from '@app/common/decorators/swaggerUploadField';

@ApiTags('Products')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiFile('files', 3, { type: CreateProductoDto })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() data: CreateProductoDto,
    @Req()
    { tenant_id }: Request,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })],
      }),
    )
    files: Array<Express.Multer.File>,
  ) {
    return this.productService.createProduct(tenant_id, data, files);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  listProducts(@Req() { tenant_id }: Request, @Query() filters: PaginatorDTO) {
    return this.productService.listProducts(tenant_id, filters);
  }

  @Get('/dashboard-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  getStats(@Req() { tenant_id }: Request, @Query('time_period') time_period) {
    return this.productService.getDashboardStats(tenant_id, time_period);
  }

  @Patch(':productId')
  @ApiFile('files', 3, { type: EditProductDto })
  @HttpCode(HttpStatus.OK)
  async editProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() body: EditProductDto,
    @Req() { tenant_id }: Request,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })],
      }),
    )
    files: Array<Express.Multer.File>,
  ) {
    return this.productService.editProduct(tenant_id, productId, files, body);
  }

  @Get(':productId')
  @HttpCode(HttpStatus.OK)
  getProduct(
    @Req() { tenant_id }: Request,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.productService.getProduct(tenant_id, productId);
  }

  @Delete('/:productId/images')
  @HttpCode(HttpStatus.OK)
  async deleteProductImage(
    @Req() { tenant_id }: Request,

    @Param('productId', ParseIntPipe) productId: number,
    @Query('url') url: string,
  ) {
    await this.productService.deleteProductImage(productId, url, tenant_id);
    return { message: 'Product image deleted successfully' };
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  deleteProduct(
    @Req() { tenant_id }: Request,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.productService.deleteProduct(tenant_id, productId);
  }

  @Post('/:productId/duplicate')
  @HttpCode(HttpStatus.CREATED)
  duplicateProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() { tenant_id }: Request,
  ) {
    return this.productService.duplicateProduct(tenant_id, productId);
  }
}
