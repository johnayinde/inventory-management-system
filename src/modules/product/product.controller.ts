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
import { ProductService } from './product.service';
import { CreateProductoDto, EditProductDto } from './dto/product.dto';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { TenantInterceptor } from '@app/common';

@ApiTags('Products')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiBody({
    description: 'create Product',
    type: CreateProductoDto,
  })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() data: CreateProductoDto, @Req() { tenant_id }: Request) {
    return this.productService.createProduct(tenant_id, data);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  listProducts(@Req() { tenant_id }: Request) {
    return this.productService.listProducts(tenant_id);
  }

  @Patch(':productId')
  @ApiBody({
    description: 'Edit Product',
    type: EditProductDto,
  })
  @HttpCode(HttpStatus.OK)
  async editUser(
    @Param('productId') productId: number,
    @Body() body: EditProductDto,
    @Req() { tenant_id }: Request,
  ) {
    return this.productService.editProduct(tenant_id, productId, body);
  }

  @Get(':productId')
  @HttpCode(HttpStatus.OK)
  getProduct(
    @Req() { tenant_id }: Request,
    @Param('productId') productId: number,
  ) {
    return this.productService.getProduct(tenant_id, productId);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  deleteProduct(
    @Req() { tenant_id }: Request,
    @Param('productId') productId: number,
  ) {
    return this.productService.deleteProduct(tenant_id, productId);
  }

  @Post('/:productId/duplicate')
  @HttpCode(HttpStatus.CREATED)
  duplicateProduct(
    @Param('productId') productId: number,
    @Req() { tenant_id }: Request,
  ) {
    return this.productService.duplicateProduct(tenant_id, productId);
  }
}
