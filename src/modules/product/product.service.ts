import { Injectable, NotFoundException } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateProductoDto, EditProductDto } from './dto/product.dto';
import { ProductStatsDto, inventoryFilters, page_generator } from '@app/common';
import {
  calculatePercentageChange,
  getLastMonthDateRange,
} from '@app/common/helpers';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';

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

  async listProducts(tenant_id: number, filters: PaginatorDTO) {
    const { skip, take } = page_generator(
      Number(filters.page),
      Number(filters.pageSize),
    );
    const filter = inventoryFilters(filters);
    const whereCondition = filter ? { tenant_id, ...filter } : { tenant_id };
    const all_products = await this.postgresService.product.findMany({
      where: whereCondition,
      include: { categories: true, Expense: true },
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
    return await this.postgresService.product.update({
      where: { id, tenant_id },
      data: {
        ...data,
        categories: {
          set: data.categoryIds.map((categoryId) => ({ id: categoryId })),
        },
      },
      include: { categories: true },
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

  async duplicateProduct(tenant_id: number, productId: number) {
    const { id, ...productToDuplicate } =
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
    const inventoryStats = await this.postgresService.inventory.findMany({
      where: {
        tenant_id,
      },
      include: {
        products: {
          include: {
            categories: {
              include: {
                sub_categories: true,
              },
            },
          },
        },
      },
    });

    const inventoryStatsLastMonth =
      await this.postgresService.inventory.findMany({
        where: {
          tenant_id,
          created_at: {
            gte: firstDayOfLastMonth,
            lte: lastDayOfLastMonth,
          },
        },
        include: {
          products: {
            include: {
              categories: {
                include: {
                  sub_categories: true,
                },
              },
            },
          },
        },
      });

    // Calculate the statistics
    const stats: ProductStatsDto = {
      totalProducts: 0,
      productsPercentageChange: 0,
      totalCategories: 0,
      categoriesPercentageChange: 0,
      totalSubcategories: 0,
      subcategoriesPercentageChange: 0,
      totalLowStocks: 0,
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
      for (const product of inventory.products) {
        stats.totalProducts++;
        if (product.categories) {
          stats.totalCategories += product.categories.length;
          for (const category of product.categories) {
            if (category.sub_categories) {
              stats.totalSubcategories += category.sub_categories.length;
            }
          }
        }

        if (product.quantity && product.quantity < 20) {
          stats.totalLowStocks++;
        }
      }
    }
  }

  private calculateLastMonthStats(inventoryStats, stats) {
    for (const inventory of inventoryStats) {
      for (const product of inventory.products) {
        stats.prevMonthTotalProducts++;
        if (product.categories) {
          stats.prevMonthTotalCategories += product.categories.length;
          for (const category of product.categories) {
            if (category.sub_categories) {
              stats.prevMonthTotalSubcategories +=
                category.sub_categories.length;
            }
          }
        }
      }
    }
  }
}
