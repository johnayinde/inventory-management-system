import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantInterceptor } from '@app/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  controllers: [TenantController],
  providers: [
    TenantService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class TenantModule {}
