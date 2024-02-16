import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  ParseIntPipe,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/category.dto';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { TenantInterceptor } from '@app/common';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';

@ApiTags('Category')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post('')
  @ApiBody({
    description: 'create Category',
    type: CreateCategoryDto,
  })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() data: CreateCategoryDto, @Req() { tenant_id }: Request) {
    return this.categoryService.createCategory(tenant_id, data);
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  getAllCategories(@Req() { tenant_id }: Request) {
    return this.categoryService.getAllCategories(tenant_id);
  }

  @Get('/:categoryId')
  @HttpCode(HttpStatus.OK)
  getSubCategory(
    @Req() { tenant_id }: Request,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query() filters: PaginatorDTO,
  ) {
    return this.categoryService.getSubcategory(tenant_id, categoryId, filters);
  }

  @Get('/counts')
  @HttpCode(HttpStatus.OK)
  categoryAndSubCounts(@Req() { tenant_id }: Request) {
    return this.categoryService.getCategoryAndSubcategoryCountByTenantId(
      tenant_id,
    );
  }

  @Delete(':categoryId')
  @HttpCode(HttpStatus.OK)
  deleteSales(
    @Req() { tenant_id }: Request,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ) {
    return this.categoryService.deleteCategory(tenant_id, categoryId);
  }
}
