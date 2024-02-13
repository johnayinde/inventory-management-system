import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateUserDto, EditUserDto } from './dto/user.dto';
import { CacheService } from '../cache/cache.service';
import { EmailService } from '../email/email.service';
import { ResetPasswordDto, ValidateTokenDto } from '../auth/dto/auth.dto';
import { decryption, encryptData } from '@app/common';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    private readonly postgresService: OrmService,
    private readonly emailService: EmailService,
    private readonly cache: CacheService,
  ) {}

  async createUser(tenant_id: number, user: CreateUserDto) {
    return await this.postgresService.$transaction(async (tx) => {
      const user_acc = await tx.user.create({
        data: {
          email: user.email,
          name: user.name,
          tenant: { connect: { id: tenant_id } },
        },
      });

      await tx.permission.create({
        data: {
          ...user.permissions,
          tenant_id,
          user_id: { connect: { id: user_acc.id } },
        },
      });

      const data = await this.emailService.sendResetPasswordToEmail(
        user_acc.email,
        'user',
      );
      this.cache.setData(data.encryptedText, data);
    });
  }

  private async comparePassword(pwd: string, cPwd: string) {
    const isMatch = pwd == cPwd;
    if (!isMatch) {
      throw new HttpException(
        'Password does not match',
        HttpStatus.BAD_GATEWAY,
      );
    }
    return isMatch;
  }
  private async hashPassword(password: string) {
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);

    return hashedPassword;
  }
  async validateEmailForPassword(
    token: ValidateTokenDto,
    body: ResetPasswordDto,
  ): Promise<string> {
    const data = await this.cache.getData(token.token);
    if (!data) {
      throw new BadRequestException('Verification failed, Please try again');
    }
    const user = decryption(data as encryptData);
    const account = await this.postgresService.user.findFirst({
      where: { email: user },
    });

    if (!account) {
      throw new UnauthorizedException(`Invalid Process, please try again`);
    }
    await this.comparePassword(body.password, body.confirm_password);

    const new_password = await this.hashPassword(body.password);

    await this.postgresService.auth.create({
      data: {
        email: user,
        password: new_password,
        isUser: true,
        email_verified: true,
      },
    });
    this.cache.delData(token.token);
    return 'New password saved!';
  }

  async suspendUser(tenant_id: number, id: number, suspend: boolean) {
    await this.postgresService.user.update({
      where: { id, tenant_id },
      data: {
        is_suspended: suspend,
        permission: {
          update: {
            dashboard: false,
            inventory: false,
            sales: false,
            expenses: false,
            report: false,
            customers: false,
          },
        },
      },
    });
    return 'Status Updated!';
  }

  async revokeUser(tenant_id: number, id: number, suspend: boolean) {
    await this.postgresService.user.update({
      where: { id, tenant_id },
      data: { is_revoked: suspend, is_suspended: suspend },
    });

    return 'Status Updated!';
  }

  async getAllTenantUsers(tenant_id: number): Promise<User[]> {
    const tenantAndUsers = await this.postgresService.tenant.findFirst({
      where: { id: tenant_id },
      include: { users: true },
    });
    return tenantAndUsers.users;
  }

  async getUserById(tenant_id: number, userId: number): Promise<User> {
    const user = await this.postgresService.user.findUnique({
      where: { id: userId, tenant_id },
      include: { permission: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async editUser(tenant_id: number, id: number, data: EditUserDto) {
    await this.postgresService.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id, tenant_id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
      await tx.user.update({
        where: { id, tenant_id },
        data: { ...data },
      });
    });

    return 'User Updated';
  }
}
