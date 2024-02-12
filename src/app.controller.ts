import { Controller, Get, Req, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { Public, Role, Roles, TenantInterceptor } from '@app/common';

@Controller()
@ApiBearerAuth()
// @Roles(Role.Dashboard)
@UseInterceptors(TenantInterceptor)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(@Req() { tenant_id }: Request) {
    console.log(tenant_id);

    return this.appService.getHello(tenant_id);
  }
}
