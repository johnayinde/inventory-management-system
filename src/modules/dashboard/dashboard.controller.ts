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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getFinancialStats(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Req() { tenant_id }: Request,
  ) {
    return this.dashboardService.calculateAnalytics(
      tenant_id,
      startDate,
      endDate,
    );
  }

  @Get('top-selling')
  @HttpCode(HttpStatus.OK)
  async getTopSelling(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Req() { tenant_id }: Request,
  ) {
    return this.dashboardService.getTopSellingProducts(
      tenant_id,
      startDate,
      endDate,
    );
  }

  @Get('/profit-margin-stats')
  @HttpCode(HttpStatus.OK)
  profitMargin(
    @Req() { tenant_id }: Request,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.dashboardService.calculateProfitMargin(
      tenant_id,
      startDate,
      endDate,
    );
  }

  @Get('/top-product-inventory')
  @HttpCode(HttpStatus.OK)
  topSellingProductsSats(
    @Req() { tenant_id }: Request,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.dashboardService.topProductInventory(
      tenant_id,
      startDate,
      endDate,
    );
  }

  @Get('/sales-overview')
  @HttpCode(HttpStatus.OK)
  salesOverview(
    @Req() { tenant_id }: Request,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.dashboardService.getSalesOverview(
      tenant_id,
      startDate,
      endDate,
    );
  }
}
