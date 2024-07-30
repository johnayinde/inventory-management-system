import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantInterceptor } from '@app/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ImageUploadService } from '@app/common/helpers';

@Module({
  controllers: [TenantController],
  providers: [TenantService, ImageUploadService],
})
export class TenantModule {}
