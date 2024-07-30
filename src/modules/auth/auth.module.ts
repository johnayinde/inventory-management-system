import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from '../cache/cache.service';
import { TenantService } from '../tenant/tenant.service';
import { ImageUploadService } from '@app/common/helpers';

@Module({
  providers: [
    AuthService,
    EmailService,
    CacheService,
    JwtService,
    TenantService,
    ImageUploadService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
