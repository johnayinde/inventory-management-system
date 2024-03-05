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
    await this.postgresService.auth.update({
      where: { id: tenant_id },
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
        'Tenant Already created business infomation',
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

  async getTenantPersonalBusnessInfo(tenant_id: number) {
    const { password, isOauthUser, ...personal_data } =
      await this.postgresService.auth.findUnique({
        where: { id: tenant_id },
      });

    const business_info = await this.postgresService.tenant.findUnique({
      where: { id: tenant_id },
      include: { business: true },
    });

    return {
      ...personal_data,
      ...business_info,
    };
  }
}
