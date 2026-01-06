import { Module, Logger } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './database/db.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import {
  AllExceptionsFilter,
  AuthGuard,
  RolesGuard,
  TransformInterceptor,
} from '@app/common';
import { JwtService } from '@nestjs/jwt';
import { EmailModule } from './modules/email/email.module';
import { CacheMod } from './modules/cache/cache.module';
import { redisStore } from 'cache-manager-redis-store';
import { TenantModule } from './modules/tenant/tenant.module';
import { CategoryModule } from './modules/category/category.module';
import { UserModule } from './modules/user/user.module';
import { ProductModule } from './modules/product/product.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { CustomerModule } from './modules/customer/customer.module';
import { SaleModule } from './modules/sale/sale.module';
import { ReportModule } from './modules/report/report.module';
import { FeesModule } from './modules/fees/fees.module';
import { ShipmentModule } from './modules/shipment/shipment.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MfaModule } from './modules/mfa/mfa.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ScheduleModule } from '@nestjs/schedule';
import { S3Module } from '@app/common/helpers/aws-lib';
import { ImageUploadService } from '@app/common/helpers';
import KeyvRedis from '@keyv/redis';
import Keyv from 'keyv';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
   CacheModule.registerAsync({
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const redisUrl = config.getOrThrow('REDIS_URL');
    const logger = new Logger('RedisCache');

    // Create Keyv instance backed by Redis
    const keyv = new Keyv(new KeyvRedis(redisUrl));
    keyv.on('error', (err) => logger.error('Keyv/Redis error', err)); // recommended in Keyv docs :contentReference[oaicite:5]{index=5}

    return { stores: [keyv] }; // Nest’s recommended approach :contentReference[oaicite:6]{index=6}
  },
}),
    ScheduleModule.forRoot(),
    AuthModule,
    CacheMod,
    CategoryModule,
    CustomerModule,
    DashboardModule,
    DatabaseModule,
    EmailModule,
    ExpenseModule,
    FeesModule,
    InventoryModule,
    MfaModule,
    NotificationModule,
    ProductModule,
    ReportModule,
    S3Module,
    SaleModule,
    ShipmentModule,
    TenantModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    Logger,
    AppService,
    ImageUploadService,
    // remove to test with auth module
    JwtService,
  ],
})
export class AppModule {}
