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
    // console.log(request);

    const user = request.user as ReqUser;
    console.log('intercepting request***');

    if (user) {
      const prisma = this.ormService;

      if (!user.isUser) {
        const tenantRecord = await prisma.tenant.findFirst({
          where: { email: user.email },
        });
        if (!tenantRecord) throw new UnauthorizedException();

        request.tenant_id = tenantRecord.id;
      } else if (user.isUser) {
        const userRec = await prisma.user.findFirst({
          where: { id: user.userId },
        });
        if (!userRec) throw new UnauthorizedException();

        request.tenant_id = userRec.tenant_id;
      }
      return next.handle();
    }
    throw new UnauthorizedException();
  }
}
