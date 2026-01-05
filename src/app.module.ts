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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
   CacheModule.registerAsync({
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const redisUrl = configService.getOrThrow('REDIS_URL');
    const logger = new Logger('RedisCache');

    const host = new URL(redisUrl).hostname;
    const isTls = redisUrl.startsWith('rediss://');

    // ✅ IMPORTANT: create the store instance
    const store = await redisStore({
      url: redisUrl,
      socket: {
        // Helpful for TLS providers; harmless if isTls=false
        tls: isTls,
        servername: host,

        reconnectStrategy: (retries: number) => {
          // Don’t return Error unless you *want* to stop forever.
          const delay = Math.min(retries * 200, 5000);
          if (retries === 10) {
            logger.warn(`Redis still reconnecting after ${retries} attempts…`);
          }
          return delay;
        },
        connectTimeout: 10_000,
        keepAlive: 5_000,
      },
    });

    // ✅ IMPORTANT: attach listeners on the underlying redis client
    const client = store.getClient();
    client.on('error', (err: Error) => logger.error('Redis error', err));
    client.on('connect', () => logger.log('Redis connected'));
    client.on('ready', () => logger.log('Redis ready'));
    client.on('reconnecting', () => logger.warn('Redis reconnecting...'));
    client.on('end', () => logger.warn('Redis connection ended'));

    return {
      store, // cache-manager expects the store instance here
    };
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
