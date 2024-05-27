import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValueType, FeeType } from '@prisma/client';

export class CreateFeeDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  value: number;

  @ApiProperty({ enum: ValueType, example: 'fixed | percentage' })
  @IsString()
  @IsEnum(ValueType)
  value_type: ValueType;

  @ApiProperty({ enum: FeeType, example: 'all | product' })
  @IsString()
  @IsEnum(FeeType)
  fee_type: FeeType;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  products_ids: number[];
}

export class EditFeeDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  value: number;

  @ApiProperty({ enum: ValueType, example: 'fixed | percentage' })
  @IsString()
  @IsEnum(ValueType)
  @IsOptional()
  value_type: ValueType;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  products_ids: number[];
}
