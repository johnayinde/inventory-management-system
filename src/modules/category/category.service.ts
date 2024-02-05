import { Injectable } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateCategoryDto } from './dto/category.dto';

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
}
