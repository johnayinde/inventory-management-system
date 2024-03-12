import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        ({
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          store: redisStore,
        } as unknown as CacheStore),
    }),
    AuthModule,
    DatabaseModule,
    EmailModule,
    CacheMod,
    TenantModule,
    CategoryModule,
    UserModule,
    ProductModule,
    ExpenseModule,
    InventoryModule,
    CustomerModule,
    SaleModule,
    ReportModule,
    FeesModule,
    ShipmentModule,
    DashboardModule,
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
    AppService,
    // remove to test with auth module
    JwtService,
  ],
})
export class AppModule {}
