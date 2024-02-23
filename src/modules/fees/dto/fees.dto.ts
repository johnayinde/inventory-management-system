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

  @ApiProperty({ enum: ValueType })
  @IsString()
  @IsEnum(ValueType)
  value_type: ValueType;

  @ApiProperty({ enum: FeeType })
  @IsString()
  @IsEnum(FeeType)
  fee_type: FeeType;

  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
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

  @ApiProperty({ enum: ValueType })
  @IsString()
  @IsEnum(ValueType)
  @IsOptional()
  value_type: ValueType;

  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  products_ids: number[];
}
