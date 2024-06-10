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
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  async getFinancialStats(
    @Req() { tenant_id }: Request,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    return this.dashboardService.calculateAnalytics(
      tenant_id,
      startDate,
      endDate,
    );
  }

  @Get('top-selling')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
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
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'startDate', required: false })
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
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'startDate', required: false })
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
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'startDate', required: false })
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

  @Get('top-inventories')
  @HttpCode(HttpStatus.OK)
  getAllInventories(@Req() { tenant_id }: Request) {
    return this.dashboardService.topInventories(tenant_id);
  }
}
