import { Injectable, NotFoundException } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateProductoDto, EditProductDto } from './dto/product.dto';
import { ProductStatsDto, inventoryFilters, page_generator } from '@app/common';
import { deleteImage, uploadImages } from '@app/common/helpers';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';

@Injectable()
export class ProductService {
  constructor(readonly postgresService: OrmService) {}

  async createProduct(
    tenant_id: number,
    data: CreateProductoDto,
    files: Array<Express.Multer.File>,
  ) {
    const { category_id, sub_category_id, ...product } = data;
    if (!category_id) {
      throw new NotFoundException('Category is required');
    }

    let image_urls = [];
    if (files && files.length > 0) {
      const folder = process.env.AWS_S3_FOLDER;
      image_urls = await uploadImages(files, folder);
    }

    const category = await this.postgresService.category.findUnique({
      where: { id: Number(category_id), tenant_id },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    let sub_category = null;
    if (sub_category_id) {
      sub_category = await this.postgresService.subcategory.findFirst({
        where: {
          id: Number(sub_category_id),
          category_id: Number(category_id),
        },
      });

      if (!sub_category) {
        throw new NotFoundException('Subcategory not found');
      }
    }

    return await this.postgresService.product.create({
      data: {
        ...product,
        attachments: image_urls,
        ...(data.threshold && { threshold: +data.threshold }),
        tenant: { connect: { id: tenant_id } },
        category: { connect: { id: category.id } },
        ...(sub_category && {
          sub_category: { connect: { id: sub_category.id } },
        }),
      },
      include: { category: true },
    });
  }

  async listProducts(tenant_id: number, filters: PaginatorDTO) {
    const { skip, take } = page_generator(
      Number(filters.page),
      Number(filters.pageSize),
    );
    const filter = inventoryFilters(filters);
    const whereCondition = filter ? { tenant_id, ...filter } : { tenant_id };
    const all_products = await this.postgresService.product.findMany({
      where: whereCondition,
      include: { category: true, expenses: true },
      skip,
      take,
      orderBy: { created_at: 'desc' },
    });
    const totalCount = await this.postgresService.product.count({
      where: whereCondition,
    });

    return {
      data: all_products || [],
      totalCount,
      pageInfo: {
        currentPage: Number(filters.page),
        perPage: Number(filters.pageSize),
        hasNextPage:
          all_products.length > Number(filters.page) * Number(filters.pageSize),
      },
    };
  }

  async editProduct(
    tenant_id: number,
    id: number,
    files: Array<Express.Multer.File>,
    data: EditProductDto,
  ) {
    const product = await this.postgresService.product.findUnique({
      where: { id, tenant_id },
      include: { category: true, sub_category: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let image_urls = product.attachments;
    if (files && files.length > 0) {
      const folder = process.env.AWS_S3_FOLDER;
      image_urls = await uploadImages(files, folder);
    }
    // Update category and subcategory if provided
    let category = product.category;
    if (data.category_id && data.category_id !== category.id) {
      category = await this.postgresService.category.findUnique({
        where: { id: Number(data.category_id), tenant_id },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    let sub_category = product.sub_category;
    if (
      data.sub_category_id &&
      (!sub_category || data.sub_category_id !== sub_category.id)
    ) {
      sub_category = await this.postgresService.subcategory.findFirst({
        where: {
          id: Number(data.sub_category_id),
          category_id: Number(data.category_id || category.id),
        },
      });
      if (!sub_category) {
        throw new NotFoundException('Subcategory not found');
      }
    }

    await this.postgresService.product.update({
      where: { id, tenant_id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.threshold && { threshold: data.threshold }),
        ...(data.description && { description: data.description }),
        attachments: image_urls,
        category_id: category.id,
        ...(sub_category && {
          sub_category_id: sub_category.id,
        }),
      },
    });

    return await this.postgresService.product.findUnique({
      where: { id, tenant_id },
      include: { category: true, sub_category: true },
    });
  }

  async getProduct(tenant_id: number, id: number) {
    const product = await this.postgresService.product.findUnique({
      where: { id, tenant_id },
      include: { category: true, fees: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async deleteProduct(tenant_id: number, id: number) {
    const deletedProduct = await this.postgresService.product.delete({
      where: { id, tenant_id },
    });
    if (!deletedProduct) {
      throw new NotFoundException('Product not found');
    }
    return deletedProduct;
  }

  async deleteProductImage(id: number, imageId: string, tenant_id: number) {
    const product = await this.postgresService.product.findUnique({
      where: { id, tenant_id },
    });

    if (!product) {
      throw new NotFoundException(`Product not found`);
    }

    const imageToDelete = product.attachments.find(
      (image) => image === imageId,
    );

    if (!imageToDelete) {
      throw new NotFoundException(`Image not found for product`);
    }
    const folder = process.env.AWS_S3_FOLDER;

    const key = `${folder}${imageToDelete.split('/')[4]}`;

    await deleteImage(key);
    await this.postgresService.product.update({
      where: { id, tenant_id },
      data: {
        attachments: {
          set: product.attachments.filter((s) => s != imageToDelete),
        },
      },
    });
  }

  async duplicateProduct(tenant_id: number, productId: number) {
    const {
      id,
      created_at,
      updated_at,
      category_id,
      sub_category_id,
      tenant_id: t_id,
      ...productToDuplicate
    } = await this.postgresService.product.findUnique({
      where: { id: productId, tenant_id },
      include: { category: true },
    });

    if (!productToDuplicate) {
      throw new NotFoundException('Product not found');
    }

    const duplicatedProduct = await this.postgresService.product.create({
      data: {
        ...productToDuplicate,
        tenant: { connect: { id: tenant_id } },
        name: `Copy of ${productToDuplicate.name}`,
        category: { connect: { id: productToDuplicate.category.id } },
      },
      include: { category: true },
    });
    return duplicatedProduct;
  }

  async getDashboardStats(tenant_id: number): Promise<ProductStatsDto> {
    const allProducts = await this.postgresService.product.findMany({
      where: {
        tenant_id,
      },
    });

    const allcategoroes = await this.postgresService.category.findMany({
      where: {
        tenant_id,
      },
      include: {
        sub_categories: true,
      },
    });

    const stats: ProductStatsDto = {
      totalProducts: 0,
      totalCategories: 0,
      totalSubcategories: 0,
    };

    this.calculateBasicStats(allProducts, allcategoroes, stats);

    return stats;
  }

  private calculateBasicStats(allProducts, allcategoroes, stats) {
    stats.totalProducts = allProducts.length;
    stats.totalCategories = allcategoroes.length;
    allcategoroes.map((category) => {
      if (category.sub_categories.length) {
        stats.totalSubcategories += category.sub_categories.length;
      }
    });
  }
}
