import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { TenantInterceptor } from '@app/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  async getFinancialStats(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.dashboardService.calculateAnalytics(tenant_id, time_period);
  }

  @Get('top-selling')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  async getTopSelling(
    @Query('time_period') time_period,
    @Req() { tenant_id }: Request,
  ) {
    return this.dashboardService.getTopSellingProducts(tenant_id, time_period);
  }

  @Get('/profit-margin-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  profitMargin(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.dashboardService.calculateProfitMargin(tenant_id, time_period);
  }

  @Get('/top-product-inventory')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  topSellingProductsSats(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.dashboardService.topProductInventory(tenant_id, time_period);
  }

  @Get('/sales-overview')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  salesOverview(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.dashboardService.getSalesOverview(tenant_id, time_period);
  }

  @Get('recent-sales')
  @HttpCode(HttpStatus.OK)
  getAllInventories(@Req() { tenant_id }: Request) {
    return this.dashboardService.recentSales(tenant_id);
  }
}
