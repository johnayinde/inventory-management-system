import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TenantInterceptor } from '@app/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheService } from '../cache/cache.service';
import { EmailService } from '../email/email.service';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    EmailService,
    CacheService,
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: TenantInterceptor,
    // },
  ],
})
export class UserModule {}
