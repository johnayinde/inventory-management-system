import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
  isURL,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ExpenseType } from '@prisma/client';

export class CreateExpenseCategoryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateExpenseDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  amount: string;

  @ApiProperty()
  @IsString()
  date: string;

  @ApiProperty({ enum: ExpenseType })
  @IsString()
  @IsEnum(ExpenseType)
  type: ExpenseType;

  @ApiProperty()
  @IsString()
  @IsUrl()
  @IsOptional()
  attachment?: string;

  @ApiProperty({ type: Number })
  @IsInt()
  @IsOptional()
  categoryId: number;

  @ApiProperty({ type: Number })
  // @IsInt()
  @IsOptional()
  productId: number;
}

export class EditExpenseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  amount?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ enum: ExpenseType })
  @IsString()
  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @ApiPropertyOptional()
  @IsString()
  @IsUrl()
  @IsOptional()
  attachment?: string;

  @ApiPropertyOptional({ type: Number })
  @IsInt()
  @IsOptional()
  categoryId?: number;

  @ApiProperty({ type: Number })
  @IsInt()
  @IsOptional()
  productId: number;
}
