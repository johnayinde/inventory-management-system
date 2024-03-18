import { Module } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { MfaController } from './mfa.controller';
import { OrmService } from 'src/database/orm.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [MfaController],
  providers: [MfaService, ConfigService],
})
export class MfaModule {}
