import { Injectable, NotFoundException } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateProductoDto, EditProductDto } from './dto/product.dto';

@Injectable()
export class ProductService {
  constructor(readonly postgresService: OrmService) {}

  async createProduct(tenant_id: number, data: CreateProductoDto) {
    const { categoryIds, ...product } = data;

    return await this.postgresService.product.create({
      data: {
        ...product,
        tenant: { connect: { id: tenant_id } },
        categories: {
          connect: categoryIds.map((categoryId) => ({ id: categoryId })),
        },
      },
      include: { categories: true },
    });
  }

  async listProducts(tenant_id: number) {
    return await this.postgresService.product.findMany({
      where: { tenant_id },
      include: { categories: true },
    });
  }

  async editProduct(
    tenant_id: number,
    productId: number,
    data: EditProductDto,
  ) {
    return await this.postgresService.product.update({
      where: { id: Number(productId), tenant_id },
      data: {
        ...data,
        categories: {
          set: data.categories.map((categoryId) => ({ id: categoryId })),
        },
      },
      include: { categories: true },
    });
  }

  async getProduct(tenant_id: number, productId: number) {
    const product = await this.postgresService.product.findUnique({
      where: { id: Number(productId), tenant_id },
      include: { categories: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async deleteProduct(tenant_id: number, productId: number) {
    const deletedProduct = await this.postgresService.product.delete({
      where: { id: Number(productId), tenant_id },
    });
    if (!deletedProduct) {
      throw new NotFoundException('Product not found');
    }
  }

  async duplicateProduct(tenant_id: number, productId: number) {
    const { id, ...productToDuplicate } =
      await this.postgresService.product.findUnique({
        where: { id: Number(productId), tenant_id },
        include: { categories: true },
      });
    if (!productToDuplicate) {
      throw new NotFoundException('Product not found');
    }

    const duplicatedProduct = await this.postgresService.product.create({
      data: {
        ...productToDuplicate,
        name: `Copy of ${productToDuplicate.name}`,
        categories: {
          connect: productToDuplicate.categories.map((categoryId) => ({
            id: categoryId.id,
          })),
        },
      },
      include: { categories: true },
    });
    return duplicatedProduct;
  }
}
