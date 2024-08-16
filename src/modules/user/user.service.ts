import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import {
  CreateUserDto,
  EditUserDto,
  UserActions,
  UserEnum,
} from './dto/user.dto';
import { CacheService } from '../cache/cache.service';
import { EmailService } from '../email/email.service';
import { USER_SIGNUP, customersFilters, page_generator } from '@app/common';
import { StatusType, User } from '@prisma/client';
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
      const user_rec = await tx.user.findFirst({
        where: { email: user.email },
      });
      let user_auth = await tx.auth.findFirst({
        where: { email: user.email, is_user: true },
        select: { email: true, first_name: true, id: true },
      });

      if (user_rec) {
        if (user_rec.tenant_id || user_rec.status == StatusType.INVITED) {
          throw new BadRequestException(
            'Cannot invite user with the email credential',
          );
        }

        if (user_rec.status == StatusType.DELETED) {
          await tx.user.update({
            where: { email: user.email, id: user_rec.id },
            data: {
              name: user.name,
              status: StatusType.INVITE_SENT,
              tenant_id,
            },
          });

          await tx.auth.update({
            where: { email: user.email, is_user: true },
            data: {
              password: default_password,
            },
          });
        }
      } else {
        const user_acc = await tx.user.create({
          data: {
            email: user.email,
            name: user.name,
            status: StatusType.INVITE_SENT,
            tenant: { connect: { id: tenant_id } },
          },
        });
        const [first_name, ...other] = user_acc.name.split(' ');

        user_auth = await tx.auth.create({
          data: {
            email: user.email,
            password: default_password,
            is_user: true,
            first_name: first_name,
            last_name: other.join(' '),
          },
          select: { email: true, first_name: true, id: true },
        });
      }

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

  async updateUserStatus(tenant_id: number, id: number, flag: UserActions) {
    const user = await this.getUserById(tenant_id, id);

    if (flag.action == UserEnum.REVOKED) {
      await this.postgresService.user.update({
        where: { id, tenant_id },
        data: {
          status: StatusType.REVOKED,
        },
      });
    } else if (flag.action == UserEnum.DELETED) {
      await this.postgresService.user.update({
        where: { id, tenant_id },
        data: {
          status: StatusType.DELETED,
        },
      });

      const te = await this.postgresService.user.update({
        where: { id: user.id },
        data: {
          tenant_id: null, // Disassociates the user from the tenant
        },
      });
    }
    return 'User Status updated successfully.';
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
      });
    });
  }
}
