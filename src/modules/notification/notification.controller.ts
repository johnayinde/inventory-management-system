import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Request } from 'express';
import { TenantInterceptor } from '@app/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Notification')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async getTopSellingProducts() {
    await this.notificationService.aggregateTopSellingProducts();
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async clearNotifications() {
    await this.notificationService.clearOldNotifications();
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getCategories(@Req() { tenant_id }: Request) {
    return this.notificationService.getAllNotification(tenant_id);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Req() { tenant_id }: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.notificationService.delete(tenant_id, id);
    return { message: 'Notification deleted successfully' };
  }
}
