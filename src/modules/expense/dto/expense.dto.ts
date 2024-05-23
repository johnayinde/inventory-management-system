import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiProperty({ type: Number })
  amount: number;

  @ApiProperty()
  @IsString()
  date: Date;

  @ApiProperty({ enum: ExpenseType })
  @IsString()
  @IsEnum(ExpenseType)
  type: ExpenseType;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  categoryId: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  shipmentId: number;

  @ApiPropertyOptional({ type: Number })
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
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  date?: Date;

  @ApiPropertyOptional({ enum: ExpenseType })
  @IsString()
  @IsOptional()
  @IsEnum(ExpenseType)
  type?: ExpenseType;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  categoryId?: number;

  @ApiProperty({ type: Number })
  @IsOptional()
  productId: number;
}
