import {
  Injectable,
  INestApplication,
  OnModuleInit,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class OrmService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(OrmService.name);
  async onModuleInit() {
    await this.$connect().then(() => {
      this.logger.debug('Prisma ORM is CONNECTED');
    });
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
