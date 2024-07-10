import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class SalesProductDto {
  @ApiProperty()
  @IsInt()
  productId: number;

  @ApiProperty()
  @IsInt()
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  selling_price?: number;
}

export class CreateSaleDto {
  @ApiProperty()
  @IsInt()
  customerId: number;

  @ApiProperty({ type: [SalesProductDto], required: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesProductDto)
  products: SalesProductDto[];
}
