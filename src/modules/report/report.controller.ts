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
  @ApiQuery({ name: 'time_period', required: false })
  async getFinancialStats(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.reportService.getDashboardStats(tenant_id, time_period);
  }

  @Get('/top-selling-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  topSellingProductsSats(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.reportService.topProductInventory(tenant_id, time_period);
  }

  @Get('/customers-overview')
  @ApiQuery({ name: 'time_period', required: false })
  @HttpCode(HttpStatus.OK)
  customerOverview(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.reportService.getCustomerStats(tenant_id, time_period);
  }

  @Get('/profit-margin-stats')
  @ApiQuery({ name: 'time_period', required: false })
  @HttpCode(HttpStatus.OK)
  profitMargin(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.reportService.calculateProfitMargin(tenant_id, time_period);
  }

  // @Get('/loss-margin-stats')
  // @ApiQuery({ name: 'time_period', required: false })
  // @HttpCode(HttpStatus.OK)
  // lossMargin(@Req() { tenant_id }: Request, @Query('time_period') time_period) {
  //   return this.reportService.calculateLossMargin(tenant_id, time_period);
  // }

  @Get('/expense-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  expenseStats(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.reportService.calculateExpenseStats(tenant_id, time_period);
  }

  @Get('/customer-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  expensCustomerSalesStatseStats(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.reportService.CustomerSalesStats(tenant_id, time_period);
  }

  @Get('/revenue-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  revenueStats(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.reportService.totalRevenue(tenant_id, time_period);
  }
}
