import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductoDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  threshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: Number, required: true })
  category_id: number;

  @ApiProperty({ type: Number, required: false })
  @IsOptional()
  sub_category_id: number;
}

export class EditProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  threshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  category_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  sub_category_id?: number;
}
