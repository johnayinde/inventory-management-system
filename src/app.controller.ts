import {
  Controller,
  Get,
  HttpStatus,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public, Role, Roles, TenantInterceptor } from '@app/common';

@Controller()
@ApiBearerAuth()
// @Roles(Role.Dashboard)
// @UseInterceptors(TenantInterceptor)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello() {
    return this.appService.getHello();
  }

  @Get('errors')
  async getErrorLogs(@Res() res: Response) {
    const log = await this.appService.getErrorLogs();
    if (typeof log === 'string') {
      return res.status(HttpStatus.NOT_FOUND).json({ message: log });
    }
    return res.status(HttpStatus.OK).json(log);
  }
}
