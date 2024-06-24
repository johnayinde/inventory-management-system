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
import { USER_SIGNUP, decryption, encryptData } from '@app/common';
import * as bcrypt from 'bcrypt';
import { Auth, User } from '@prisma/client';

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

      const data = await this.emailService.sendResetPasswordToEmail(
        user.email,
        { user: user_acc, user_permissions: user.permissions },
        'user',
      );

      this.cache.setData(data.encryptedText, data);
      return USER_SIGNUP;
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
  ): Promise<Auth> {
    const data = await this.cache.getData(token.token);
    if (!data) {
      throw new BadRequestException('Verification failed, Please try again');
    }
    const { user, user_permissions } = decryption(data as encryptData);
    const account = await this.postgresService.user.findFirst({
      where: { email: user.email },
    });

    if (!account) {
      throw new UnauthorizedException(`Invalid Process, please try again`);
    }
    await this.comparePassword(body.password, body.confirm_password);

    const new_password = await this.hashPassword(body.password);

    const user_auth = await this.postgresService.auth.create({
      data: {
        email: user.email,
        password: new_password,
        is_user: true,
        email_verified: true,
      },
    });
    this.cache.delData(token.token);

    await this.postgresService.permission.create({
      data: {
        ...user_permissions,
        user_auth: { connect: { id: user_auth.id } },
        user: { connect: { id: account.id } },
      },
    });

    return user_auth;
  }

  async suspendUser(tenant_id: number, id: number, suspend: boolean) {
    await this.postgresService.user.update({
      where: { id, tenant_id },
      data: {
        is_suspended: suspend,
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
    const tenantAndUsers = await this.postgresService.user.findMany({
      where: { tenant_id },
      include: { permissions: true },
    });
    return tenantAndUsers;
  }

  async getUserById(tenant_id: number, userId: number): Promise<User> {
    const user = await this.postgresService.user.findUnique({
      where: { id: userId, tenant_id },
      include: { permissions: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async editUser(tenant_id: number, id: number, data: EditUserDto) {
    return await this.postgresService.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id, tenant_id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
      const { permissions, ...user_doc } = data;

      await tx.user.update({
        where: { id, tenant_id },
        data: { ...user_doc },
      });

      if (permissions) {
        await tx.permission.update({
          where: { user_id: id },
          data: { ...permissions },
        });
      }
      return await tx.user.findUnique({
        where: { id, tenant_id },
        include: { permissions: true },
      });
    });
  }
}
