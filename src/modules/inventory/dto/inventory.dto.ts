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
  cost_price: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  selling_price: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  serial_number?: string;
}

export class InventoryPayload {
  @ApiProperty()
  @IsString()
  pid: string;

  @ApiProperty({
    enum: PricingType,
    default: PricingType.bulk,
    example: 'bulk | individual',
  })
  @IsString()
  @IsEnum(PricingType)
  pricing_type: PricingType;

  @ApiProperty()
  @IsInt()
  // @IsOptional()
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  selling_price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  cost_price?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ type: [IndividualPricing] })
  @IsArray()
  @Type(() => IndividualPricing)
  @ValidateNested({ each: true })
  @IsOptional()
  individual_items?: IndividualPricing[];
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
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  quantity?: number;
}

export class CreateInventoryDto {
  @ApiProperty({
    type: [InventoryPayload],
    example: exampleCreateInventoryDto,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryPayload)
  inventories: InventoryPayload[];
}
