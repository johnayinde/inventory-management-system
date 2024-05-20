import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { Request } from 'express';
import { TenantInterceptor } from '@app/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Reports')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('card-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  async getFinancialStats(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Req() { tenant_id }: Request,
  ) {
    return this.reportService.getDashboardStats(tenant_id, startDate, endDate);
  }

  @Get('/top-selling-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  topSellingProductsSats(
    @Req() { tenant_id }: Request,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.reportService.getTopSellingProductsStats(
      tenant_id,
      startDate,
      endDate,
    );
  }

  @Get('/customers-overview')
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @HttpCode(HttpStatus.OK)
  customerOverview(
    @Req() { tenant_id }: Request,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.reportService.getCustomerStats(tenant_id, startDate, endDate);
  }

  @Get('/profit-margin-stats')
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @HttpCode(HttpStatus.OK)
  profitMargin(
    @Req() { tenant_id }: Request,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.reportService.calculateProfitMargin(
      tenant_id,
      startDate,
      endDate,
    );
  }

  @Get('/loss-margin-stats')
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @HttpCode(HttpStatus.OK)
  lossMargin(
    @Req() { tenant_id }: Request,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.reportService.calculateLossMargin(
      tenant_id,
      startDate,
      endDate,
    );
  }

  @Get('/expense-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  expenseStats(
    @Req() { tenant_id }: Request,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.reportService.calculateExpenseStats(
      tenant_id,
      startDate,
      endDate,
    );
  }

  @Get('/customer-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  expensCustomerSalesStatseStats(
    @Req() { tenant_id }: Request,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.reportService.CustomerSalesStats(tenant_id, startDate, endDate);
  }

  @Get('/revenue-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  revenueStats(
    @Req() { tenant_id }: Request,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.reportService.totalRevenue(tenant_id, startDate, endDate);
  }
}
