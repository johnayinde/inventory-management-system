import {
  Injectable,
  INestApplication,
  OnModuleInit,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class OrmService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(OrmService.name);
  async onModuleInit() {
    await this.useSoftDelete();
    await this.$connect().then(() => {
      this.logger.debug('Prisma ORM is CONNECTED');
    });
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async useSoftDelete() {
    this.logger.debug('MiddlewareParams');

    this.$use(async (params, next) => {
      // Check incoming query type
      if (params.action == 'delete') {
        // Delete queries
        // Change action to an update
        params.action = 'update';
        params.args['data'] = { deleted: true };
      }
      if (params.action == 'deleteMany') {
        // Delete many queries
        params.action = 'updateMany';
        if (params.args.data != undefined) {
          params.args.data['deleted'] = true;
        } else {
          params.args['data'] = { deleted: true };
        }
      }
      return next(params);
    });
    this.$use(async (params, next) => {
      if (params.action === 'findUnique' || params.action === 'findFirst') {
        // Change to findFirst - you cannot filter
        // by anything except ID / unique with findUnique
        params.action = 'findFirst';
        // Add 'deleted' filter
        // ID filter maintained
        params.args.where['deleted'] = false;
      }
      if (params.action === 'findMany') {
        // Find many queries
        if (params.args.where) {
          if (!params.args.where.deleted) {
            // Exclude deleted records if they have not been explicitly requested
            params.args.where['deleted'] = false;
          }
        } else {
          params.args['where'] = { deleted: false };
        }
      }

      if (params.action === 'count') {
        // Count queries
        if (params.args.where) {
          if (!params.args.where.deleted) {
            // Exclude deleted records if they have not been explicitly requested
            params.args.where['deleted'] = false;
          }
        } else {
          params.args['where'] = { deleted: false };
        }
      }
      // Handle relations for soft delete
      const result = await next(params);

      if (params.args.include) {
        for (const relation of Object.keys(params.args.include)) {
          if (Array.isArray(result)) {
            result.forEach((item) => {
              if (item[relation] && Array.isArray(item[relation])) {
                item[relation] = item[relation].filter(
                  (relatedItem) => !relatedItem.deleted,
                );
              }
            });
          } else if (
            result &&
            result[relation] &&
            Array.isArray(result[relation])
          ) {
            result[relation] = result[relation].filter(
              (relatedItem) => !relatedItem.deleted,
            );
          }
        }
      }

      return result;
    });

    this.$use(async (params, next) => {
      if (params.action == 'update') {
        // Change to updateMany - you cannot filter
        // by anything except ID / unique with findUnique
        params.action = 'updateMany';
        // Add 'deleted' filter
        // ID filter maintained
        params.args.where['deleted'] = false;
      }
      if (params.action == 'updateMany') {
        if (params.args.where != undefined) {
          params.args.where['deleted'] = false;
        } else {
          params.args['where'] = { deleted: false };
        }
      }
      return next(params);
    });
  }
}
