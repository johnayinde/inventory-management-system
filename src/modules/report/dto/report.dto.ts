import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RecordExists } from '@app/common';
import { StatusType } from '@prisma/client';

export class ReportDashboardStatsDto {
  totalRevenue: number;
  netProfit: number;
  totalExpenses: number;
  totalLosses: number;
}
