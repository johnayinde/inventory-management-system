import { Injectable } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateCategoryDto } from './dto/category.dto';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';
import { page_generator, subCategoryFilters } from '@app/common';

@Injectable()
export class CategoryService {
  constructor(readonly postgresService: OrmService) {}

  async createCategory(tenant_id: number, data: CreateCategoryDto) {
    const { sub_categories, ...categoryData } = data;

    return await this.postgresService.category.create({
      data: {
        ...categoryData,
        tenant: { connect: { id: tenant_id } },
        sub_categories: { create: sub_categories || [] },
      },
    });
  }

  async getAllCategories(tenant_id: number) {
    return await this.postgresService.category.findMany({
      where: { tenant_id: tenant_id },
      include: { sub_categories: true },
    });
  }
  async getCategoryAndSubcategoryCountByTenantId(tenant_id: number) {
    const categoryCount = await this.postgresService.category.count({
      where: {
        tenant_id,
      },
    });

    const subcategoryCount = await this.postgresService.subcategory.count({
      where: {
        category: {
          tenant_id,
        },
      },
    });
    return { categoryCount, subcategoryCount };
  }

  async deleteCategory(tenant_id: number, id: number) {
    return await this.postgresService.category.delete({
      where: { tenant_id, id },
    });
  }

  async getSubcategory(tenant_id: number, id: number, filters: PaginatorDTO) {
    const { skip, take } = page_generator(
      Number(filters.page),
      Number(filters.pageSize),
    );
    const filter = subCategoryFilters(filters);
    const whereCondition = filter
      ? { tenant_id, id, ...filter }
      : { tenant_id, id };

    const all_subCategory = await this.postgresService.category.findFirst({
      where: whereCondition,
      include: { sub_categories: true, products: true },
      skip,
      take,
    });

    return {
      data: all_subCategory.sub_categories || [],
      totalCount: all_subCategory.sub_categories.length || 0,
      pageInfo: {
        currentPage: Number(filters.page),
        perPage: Number(filters.pageSize),
        hasNextPage:
          all_subCategory.sub_categories.length >
          Number(filters.page) * Number(filters.pageSize),
      },
    };
  }
}
