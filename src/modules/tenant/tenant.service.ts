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
    await this.postgresService.$transaction([
      this.postgresService.auth.update({
        where: { id: tenant_id },
        data: {
          ...data.personal_info,
        },
      }),

      this.postgresService.business.update({
        where: { id: tenant_id },
        data: {
          ...data.business_info,
        },
      }),
    ]);
    return 'Update successful';
  }

  async getTenantPersonalBusnessInfo(email: string) {
    const { password, is_oauth_user, ...personal_data } =
      await this.postgresService.auth.findFirst({
        where: { email },
      });

    const business_info = await this.postgresService.tenant.findFirst({
      where: { email },
      include: { business: true },
    });

    return {
      personal: personal_data,
      business: business_info,
    };
  }

  async getTenantInfo(tenant_id: number) {
    const tenant_info = await this.postgresService.tenant.findFirst({
      where: { id: tenant_id },
      include: { business: true },
    });

    const { password, is_oauth_user, ...personal_data } =
      await this.postgresService.auth.findFirst({
        where: { email: tenant_info.email },
      });

    return {
      personal: personal_data,
      business: tenant_info?.business,
    };
  }
}
