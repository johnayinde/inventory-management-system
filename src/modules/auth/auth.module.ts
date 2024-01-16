import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from '../cache/cache.service';

@Module({
  providers: [AuthService, EmailService, CacheService, JwtService],
  controllers: [AuthController],
})
export class AuthModule {}
