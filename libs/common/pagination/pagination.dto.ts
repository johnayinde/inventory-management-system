import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginatorDTO {
  @ApiPropertyOptional()
  page: number;

  @ApiPropertyOptional()
  pageSize: number;

  filter: {};

  @ApiPropertyOptional()
  search?: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  productId?: number;

  @ApiPropertyOptional()
  catId?: number;

  @ApiPropertyOptional()
  sub_catId?: number;

  @ApiPropertyOptional()
  customerId?: number;

  @ApiPropertyOptional()
  invoiceId?: number;

  @ApiPropertyOptional()
  expenseId?: number;

  @ApiPropertyOptional()
  shipmentId?: number;

  @ApiPropertyOptional()
  amount?: number;

  @ApiPropertyOptional()
  date?: string;
}
