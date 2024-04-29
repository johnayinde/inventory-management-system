import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../types';
import { ROLES_KEY } from '../decorators';
import { ReqUser } from '../intefaces';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user as ReqUser;

    if (!user.isUser) {
      return true;
    } else if (user.isUser) {
      const prisma = new PrismaClient();

      const permission = await prisma.permission.findFirst({
        where: { userId: user.userId },
      });
      await prisma.$disconnect();

      if (!permission) {
        return false;
      }

      return requiredRoles.some((role) => permission[role]);
    }
  }
}
