import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/category.dto';
import { ApiBearerAuth, ApiBody,  ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('Category')
@ApiBearerAuth()
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

  @Get('/counts')
  @HttpCode(HttpStatus.OK)
  categoryAndSubCounts(@Req() { tenant_id }: Request) {
    return this.categoryService.getCategoryAndSubcategoryCountByTenantId(
      tenant_id,
    );
  }
}
