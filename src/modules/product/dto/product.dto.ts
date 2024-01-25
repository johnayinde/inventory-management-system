import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductoDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  categoryIds: number[];
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

  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  categories?: number[];
}
