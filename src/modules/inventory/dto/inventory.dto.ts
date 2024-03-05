import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PricingType } from '@prisma/client';
import { Type } from 'class-transformer';
import { exampleCreateInventoryDto } from './example';

class IndividualPricing {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  price: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serial_number?: string;
}

class BulkPricing {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  price: number;

  @ApiPropertyOptional({ type: 'integer' })
  @IsInt()
  quantity_threshold: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;
}

export class InventoryPayload {
  @ApiProperty({ enum: PricingType, default: PricingType.bulk })
  @IsString()
  @IsEnum(PricingType)
  @IsOptional()
  pricing_type: PricingType;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  quantity: number;

  //individual pricing
  @ApiProperty({ type: BulkPricing })
  @Type(() => BulkPricing)
  @ValidateNested({ each: true })
  @IsOptional()
  bulk_pricing?: BulkPricing;

  @ApiProperty({ type: [IndividualPricing] })
  @IsArray()
  @Type(() => IndividualPricing)
  @ValidateNested({ each: true })
  @IsOptional()
  individual_pricing?: IndividualPricing[];
}

export class EditInventoryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  price?: number;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  quantity?: number;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  quantity_threshold?: number;
}

export class CreateInventoryDto {
  @ApiProperty({
    type: () => InventoryPayload,
    description: 'Product details by ID',
    example: exampleCreateInventoryDto,
  })
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => InventoryPayload)
  products: Record<string, InventoryPayload>;
}
