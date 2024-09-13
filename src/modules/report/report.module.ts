import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { DashboardService } from '../dashboard/dashboard.service';

@Module({
  controllers: [ReportController],
  providers: [ReportService, DashboardService],
})
export class ReportModule {}
