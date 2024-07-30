import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EditPersonalBusinessDTO,
  TenantBusinessDTO,
  TenantPersonalInfoDto,
} from './dto/tenant.dto';
import { OrmService } from 'src/database/orm.service';
import { ChangePasswordDTO } from '../auth/dto/auth.dto';
import {
  compareHashedPasswords,
  comparePasswordString,
  hashPassword,
  ImageUploadService,
} from '@app/common/helpers';

@Injectable()
export class TenantService {
  constructor(
    readonly postgresService: OrmService,
    readonly imageUploadService: ImageUploadService,
  ) {}

  async createTenantInfo(tenant_id: number, data: TenantPersonalInfoDto) {
    const tenant_data = await this.postgresService.tenant.findUnique({
      where: {
        id: tenant_id,
      },
    });

    await this.postgresService.auth.update({
      where: { email: tenant_data.email },
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
      },
    });
    return 'Update successful';
  }

  async createTenantBusinessInfo(tenant_id: number, data: TenantBusinessDTO) {
    const tenant_business = await this.postgresService.business.findUnique({
      where: { tenant_id },
    });
    if (tenant_business) {
      throw new BadRequestException(
        'Tenant Already created business information',
      );
    }
    await this.postgresService.business.create({
      data: {
        business_address: data.business_address,
        business_name: data.business_name,
        business_type: data.business_type,
        country: data.country,
        tenant: { connect: { id: tenant_id } },
      },
    });

    return 'Update successful';
  }

  async updateTenantPersonalBusnessInfo(
    tenant_id: number,
    user_data,
    data: EditPersonalBusinessDTO,
    files?: Array<Express.Multer.File>,
  ) {
    const { email } = user_data;

    let profile_photo: string;

    if (files.length) {
      [profile_photo] = await this.imageUploadService.uploadImages(files);
    }

    await this.postgresService.$transaction(async (tx) => {
      await tx.auth.update({
        where: { email },
        data: {
          ...data.personal_info,
          profile_photo: profile_photo || null,
        },
      });

      await tx.business.update({
        where: { tenant_id },
        data: {
          ...data.business_info,
        },
      });
    });
    return await this.getTenantInfo(tenant_id, user_data);
  }

  async getTenantPersonalBusnessInfo(email: string) {
    const {
      password,
      is_oauth_user,
      email: user_email,
      is_user,
      ...personal_data
    } = await this.postgresService.auth.findFirst({
      where: { email },
    });

    if (is_user) {
      const { id: tenent_id } = await this.postgresService.tenant.findFirst({
        where: { users: { some: { email: { in: [user_email] } } } },
      });

      const business_info = await this.postgresService.tenant.findFirst({
        where: { id: tenent_id },
        include: { business: true },
      });

      return {
        personal: personal_data,
        business: business_info,
      };
    }

    const business_info = await this.postgresService.tenant.findFirst({
      where: { email },
      include: { business: true },
    });

    return {
      personal: personal_data,
      business: business_info,
    };
  }

  async getTenantInfo(tenant_id: number, user_data = null) {
    const { email } = user_data;

    const { password, is_oauth_user, permission, ...personal_data } =
      await this.postgresService.auth.findFirst({
        where: { email },
        include: { permission: true },
      });

    const tenant_info = await this.postgresService.tenant.findFirst({
      where: { id: tenant_id },
      include: { business: true },
    });

    return {
      personal: personal_data,
      business: tenant_info?.business,
      permissions: permission,
    };
  }

  async changePassword(user_data, data: ChangePasswordDTO): Promise<void> {
    const { current_password, confirm_password, password } = data;
    const { email } = user_data;

    const user = await this.postgresService.auth.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await comparePasswordString(password, confirm_password);

    const isPasswordValid = await compareHashedPasswords(
      current_password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await hashPassword(password);

    await this.postgresService.auth.update({
      where: { email },
      data: { password: hashedPassword },
    });
  }
}
