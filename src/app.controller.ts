import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller()
// @Public()
@ApiBearerAuth()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  // @TenancyIdCheck('tenantId')
  getHello(@Query() data) {
    return this.appService.getHello(data.tenantId);
  }
}
