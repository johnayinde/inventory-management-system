import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationConfigDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  low_stock_notifier: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  sold_out_notifier: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  top_selling_notifier: boolean;
}
