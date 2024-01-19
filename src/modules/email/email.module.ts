import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';

@Module({
  providers: [EmailService, ConfigService, CacheService],
})
export class EmailModule {}
