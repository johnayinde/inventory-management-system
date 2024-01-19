import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  //   constructor(private prisma: PrismaClient) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user) {
      const prisma = new PrismaClient();

      const tenantRecord = await prisma.tenant.findFirst({
        where: { tenantId: user.id },
      });
      await prisma.$disconnect();
      console.log({ tenantRecord });

      if (tenantRecord) {
        request.query.tenantId = tenantRecord.tenantId;
      }
    }

    return next.handle();
  }
}
