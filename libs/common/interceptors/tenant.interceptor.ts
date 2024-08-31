import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ReqUser } from '../intefaces';
import { OrmService } from 'src/database/orm.service';

declare global {
  namespace Express {
    interface Request {
      tenant_id?: number;
      user_id?: number;
      user?: { is_user: boolean; email: string; user_id: number };
    }
  }
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly ormService: OrmService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as ReqUser;

    if (user) {
      const prisma = this.ormService;

      if (!user.isUser) {
        // Tenant's
        const tenantRecord = await prisma.tenant.findFirst({
          where: { email: user.email },
        });
        if (!tenantRecord) throw new UnauthorizedException();

        request.tenant_id = tenantRecord.id;
        request.user = { is_user: false, email: tenantRecord.email };
      } else if (user.isUser) {
        // User's
        const userRec = await prisma.user.findFirst({
          where: { email: user.email },
        });
        if (!userRec) throw new UnauthorizedException();

        request.tenant_id = userRec.tenant_id;
        request.user_id = userRec.id;
        request.user = {
          is_user: true,
          email: user.email,
          user_id: userRec.id,
        };
      }
      return next.handle();
    }
    throw new UnauthorizedException();
  }
}
