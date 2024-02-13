import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class SalesProductDto {
  @ApiProperty()
  @IsInt()
  productId: number;

  @ApiProperty()
  @IsInt()
  quantity: number;
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
