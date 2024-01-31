import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PricingType } from '@prisma/client';
import { Type } from 'class-transformer';

export class ProductUpdateDto {
  @ApiProperty()
  @IsInt()
  productId: number;

  @ApiProperty()
  @IsString()
  selling_price: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  serial_number: string;

  @ApiProperty()
  @IsInt()
  quantity: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachment?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateInventoryDto {
  @ApiProperty()
  @IsString()
  shipping_name: string;

  @ApiPropertyOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @ApiProperty()
  @IsString()
  cost_price: string;

  @ApiProperty()
  @IsString()
  expected_price: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  expenses?: number[];

  @ApiProperty({ enum: PricingType, default: PricingType.individual })
  @IsString()
  @IsEnum(PricingType)
  pricing_type?: PricingType;

  // bulk
  @ApiPropertyOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsString()
  bulk_price?: string;

  @ApiProperty()
  @IsInt()
  quantity: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  products_ids: number[];

  @ApiProperty({ type: [ProductUpdateDto] })
  @IsArray()
  @Type(() => ProductUpdateDto)
  @ValidateNested({ each: true })
  @IsOptional()
  individual_products?: ProductUpdateDto[];
}

export class EditInventoryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  shipping_name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  attachments?: number[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cost_price?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  expected_price?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bulk_price?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @IsOptional()
  products?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  expenses?: number[];
}
