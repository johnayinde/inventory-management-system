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
  @IsString()
  @IsOptional()
  reference: string;

  @ApiProperty()
  @IsNumber()
  amount: number;
}
export class CreateShipmentDto {
  @ApiProperty()
  @IsString()
  shipping_name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  reference: string;

  @ApiPropertyOptional()
  @IsString()
  date: Date;

  @ApiPropertyOptional()
  @IsNotEmpty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
  //

  @ApiPropertyOptional({ type: [ExpenseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  expenses?: ExpenseDto[];

  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  products: number[];
}
