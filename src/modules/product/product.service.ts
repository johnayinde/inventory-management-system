import { Injectable, NotFoundException } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateProductoDto, EditProductDto } from './dto/product.dto';
import { ProductStatsDto, inventoryFilters, page_generator } from '@app/common';
import {
  calculatePercentageChange,
  deleteImage,
  getLastMonthDateRange,
  uploadImages,
} from '@app/common/helpers';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';

@Injectable()
export class ProductService {
  constructor(readonly postgresService: OrmService) {}

  async createProduct(
    tenant_id: number,
    data: CreateProductoDto,
    files: Array<Express.Multer.File>,
  ) {
    const { categories, ...product } = data;
    const folder = process.env.AWS_S3_FOLDER;
    const image_urls = await uploadImages(files, folder);

    return await this.postgresService.product.create({
      data: {
        ...product,
        attachments: image_urls,
        tenant: { connect: { id: tenant_id } },
        categories: {
          connect: categories.map((id) => ({ id })),
        },
      },
      include: { categories: true },
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
      include: { categories: true, expenses: true },
      skip,
      take,
    });

    return {
      data: all_products || [],
      totalCount: all_products.length || 0,
      pageInfo: {
        currentPage: Number(filters.page),
        perPage: Number(filters.pageSize),
        hasNextPage:
          all_products.length > Number(filters.page) * Number(filters.pageSize),
      },
    };
  }

  async editProduct(tenant_id: number, id: number, data: EditProductDto) {
    //  const updatedProduct = await this.postgresService.product.update({
    //    where: { id, tenant_id },
    //    data: {
    //      name: data.name,
    //      description: data.description,
    //    },
    //  });

    //  await this.postgresService.productCategories.deleteMany({
    //    where: { productId: id },
    //  });

    //  if (data.categoryIds?.length) {
    //    await this.postgresService.productCategories.createMany({
    //      data: data.categoryIds.map((categoryId) => ({
    //        productId: id,
    //        categoryId,
    //      })),
    //    });
    //  }
    return await this.postgresService.product.update({
      where: { id, tenant_id },
      data: {
        name: data.name,
        description: data.description,

        // categories: {
        //   set: data.categoryIds?.map((categoryId) => ({ id: categoryId })),
        // },
      },
      // include: { categories: true },
    });
  }

  async getProduct(tenant_id: number, id: number) {
    const product = await this.postgresService.product.findUnique({
      where: { id, tenant_id },
      include: { categories: true },
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
    const { id, created_at, updated_at, ...productToDuplicate } =
      await this.postgresService.product.findUnique({
        where: { id: productId, tenant_id },
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

  async getDashboardStats(tenant_id: number): Promise<ProductStatsDto> {
    const { firstDayOfLastMonth, lastDayOfLastMonth } = getLastMonthDateRange();

    // Fetch data from the database
    const inventoryStats = await this.postgresService.product.findMany({
      where: {
        tenant_id,
      },
      include: {
        categories: {
          include: {
            sub_categories: true,
          },
        },
      },
    });

    const inventoryStatsLastMonth = await this.postgresService.product.findMany(
      {
        where: {
          tenant_id,
          created_at: {
            gte: firstDayOfLastMonth,
            lte: lastDayOfLastMonth,
          },
        },
        include: {
          categories: {
            include: {
              sub_categories: true,
            },
          },
        },
      },
    );

    // Calculate the statistics
    const stats: ProductStatsDto = {
      totalProducts: 0,
      productsPercentageChange: 0,
      totalCategories: 0,
      categoriesPercentageChange: 0,
      totalSubcategories: 0,
      subcategoriesPercentageChange: 0,
    };

    // Keep track of the previous month's counts
    const lastMonthStats = {
      prevMonthTotalProducts: 0,
      prevMonthTotalCategories: 0,
      prevMonthTotalSubcategories: 0,
    };

    this.calculateBasicStats(inventoryStats, stats);
    this.calculateLastMonthStats(inventoryStatsLastMonth, lastMonthStats);

    // Calculate the percentage increase/decrease for each category
    stats.productsPercentageChange = calculatePercentageChange(
      stats.totalProducts,
      lastMonthStats.prevMonthTotalProducts,
    );
    stats.categoriesPercentageChange = calculatePercentageChange(
      stats.totalCategories,
      lastMonthStats.prevMonthTotalCategories,
    );
    stats.subcategoriesPercentageChange = calculatePercentageChange(
      stats.totalSubcategories,
      lastMonthStats.prevMonthTotalSubcategories,
    );

    return stats;
  }

  private calculateBasicStats(inventoryStats, stats) {
    for (const inventory of inventoryStats) {
      stats.totalProducts++;
      if (inventory.categories) {
        stats.totalCategories += inventory.categories.length;
        for (const category of inventory.categories) {
          if (category.sub_categories) {
            stats.totalSubcategories += category.sub_categories.length;
          }
        }
      }
    }
  }

  private calculateLastMonthStats(inventoryStats, stats) {
    for (const inventory of inventoryStats) {
      stats.prevMonthTotalProducts++;
      if (inventory.categories) {
        stats.prevMonthTotalCategories += inventory.categories.length;
        for (const category of inventory.categories) {
          if (category.sub_categories) {
            stats.prevMonthTotalSubcategories += category.sub_categories.length;
          }
        }
      }
    }
  }
}
