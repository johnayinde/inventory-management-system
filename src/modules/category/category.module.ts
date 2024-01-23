import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { TenantInterceptor } from '@app/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  controllers: [CategoryController],
  providers: [
    CategoryService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class CategoryModule {}
