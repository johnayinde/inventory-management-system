import { Module } from '@nestjs/common';
import { SaleService } from './sale.service';
import { SaleController } from './sale.controller';
import { OrmService } from 'src/database/orm.service';
import { DashboardService } from '../dashboard/dashboard.service';

@Module({
  controllers: [SaleController],
  providers: [SaleService, DashboardService],
})
export class SaleModule {}
