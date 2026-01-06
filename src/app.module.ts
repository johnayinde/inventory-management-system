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
      useFactory: async (config: ConfigService) => {
        const logger = new Logger('RedisCache');

        // Use REDIS_URL if provided, otherwise build from individual credentials
        const redisUrl = config.get('REDIS_URL');

        if (redisUrl) {
          // Parse the URL to extract components for node-redis v4
          const url = new URL(redisUrl);
          const isTls = url.protocol === 'rediss:';

          const store = await redisStore({
            socket: {
              host: url.hostname,
              port: parseInt(url.port, 10) || 6379,
              tls: isTls,
            },
            username: url.username || undefined,
            password: url.password || undefined,
          });

          return {
            store: store as unknown as CacheStore,
          };
        }

        // Use individual credentials
        const host = config.get('REDIS_HOST', '127.0.0.1');
        const port = parseInt(config.get('REDIS_PORT', '6379'), 10);
        const username = config.get('REDIS_USER', '') || undefined;
        const password = config.get('REDIS_PASSWORD', '') || undefined;
        const useTls = config.get('REDIS_TLS', 'false') === 'true';

        const store = await redisStore({
          socket: {
            host,
            port,
            tls: useTls,
          },
          username,
          password,
        });

        return {
          store: store as unknown as CacheStore,
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
