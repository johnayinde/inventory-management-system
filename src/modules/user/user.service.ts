import { Injectable, NotFoundException } from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateUserDto, EditUserDto } from './dto/user.dto';
import { CacheService } from '../cache/cache.service';
import { EmailService } from '../email/email.service';
import { USER_SIGNUP, customersFilters, page_generator } from '@app/common';
import { Auth, User } from '@prisma/client';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';
import { generatePassword } from '@app/common/helpers';

@Injectable()
export class UserService {
  constructor(
    private readonly postgresService: OrmService,
    private readonly emailService: EmailService,
    private readonly cache: CacheService,
  ) {}

  async createUser(tenant_id: number, user: CreateUserDto) {
    const default_password = generatePassword();

    return await this.postgresService.$transaction(async (tx) => {
      const user_acc = await tx.user.create({
        data: {
          email: user.email,
          name: user.name,
          tenant: { connect: { id: tenant_id } },
        },
      });
      const [first_name, ...other] = user.name.split(' ');

      const user_auth = await tx.auth.create({
        data: {
          email: user.email,
          password: default_password,
          is_user: true,
          first_name: first_name,
          last_name: other.join(' '),
        },
      });

      const data = await this.emailService.sendResetPasswordToEmail(
        user.email,
        {
          is_user_flag: true,
          data: { ...user_auth, user_permissions: user.permissions },
        },
      );

      this.cache.setData(data.encryptedText, data);
      return USER_SIGNUP;
    });
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

  async getAllTenantUsers(tenant_id: number, filters: PaginatorDTO) {
    const { skip, take } = page_generator(
      Number(filters.page),
      Number(filters.pageSize),
    );
    const filter = customersFilters(filters);
    const whereCondition = filter ? { tenant_id, ...filter } : { tenant_id };

    const tenantAndUsers = await this.postgresService.user.findMany({
      where: whereCondition,
      include: { permissions: true },
      skip,
      take,
      orderBy: { created_at: 'desc' },
    });

    const totalCount = await this.postgresService.user.count({
      where: { tenant_id },
    });

    return {
      data: tenantAndUsers || [],
      totalCount,
      pageInfo: {
        currentPage: Number(filters.page),
        perPage: Number(filters.pageSize),
        hasNextPage:
          tenantAndUsers.length >
          Number(filters.page) * Number(filters.pageSize),
      },
    };
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
