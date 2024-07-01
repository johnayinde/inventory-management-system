import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EditPersonalBusinessDTO,
  TenantBusinessDTO,
  TenantPersonalInfoDto,
} from './dto/tenant.dto';
import { OrmService } from 'src/database/orm.service';

@Injectable()
export class TenantService {
  constructor(readonly postgresService: OrmService) {}

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
    data: EditPersonalBusinessDTO,
  ) {
    await this.postgresService.$transaction(async (tx) => {
      await tx.auth.update({
        where: { id: tenant_id },
        data: {
          ...data.personal_info,
        },
      });

      await tx.business.update({
        where: { id: tenant_id },
        data: {
          ...data.business_info,
        },
      });
    });
    return await this.getTenantInfo(tenant_id);
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
    console.log(is_user);

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

  async getTenantInfo(tenant_id: number, user_id = 0) {
    let personal = null;
    let business = null;

    const tenant_info = await this.postgresService.tenant.findFirst({
      where: { id: tenant_id },
      include: { business: true },
    });

    if (user_id) {
      const { email } = await this.postgresService.user.findFirst({
        where: { id: user_id },
      });

      const { password, is_oauth_user, ...personal_data } =
        await this.postgresService.auth.findFirst({
          where: { email },
        });

      personal = personal_data;
    } else {
      const { password, is_oauth_user, ...personal_data } =
        await this.postgresService.auth.findFirst({
          where: { email: tenant_info.email },
        });

      personal = personal_data;
      business = personal_data;
    }

    return {
      personal,
      business: tenant_info?.business,
    };
  }
}
