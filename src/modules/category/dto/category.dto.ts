import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSubCategoryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  description?: string;
}

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [CreateSubCategoryDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSubCategoryDto)
  @IsOptional()
  sub_categories?: CreateSubCategoryDto[];
}
