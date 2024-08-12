import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ExpenseDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  amount: number;
}
export class CreateShipmentDto {
  @ApiProperty()
  @IsString({ message: 'Shippment name is required' })
  shipping_name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reference: string;

  @ApiPropertyOptional({ default: new Date() })
  @IsString()
  date: Date;

  @ApiPropertyOptional()
  @IsOptional()
  price?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ type: [ExpenseDto] })
  @IsOptional()
  expenses?: ExpenseDto[];

  @ApiProperty({ isArray: true })
  @IsArray({ message: 'Products are required' })
  products: string[];
}
