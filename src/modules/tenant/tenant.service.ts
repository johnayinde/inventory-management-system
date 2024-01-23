import { HttpException, Injectable } from '@nestjs/common';
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
    try {
      await this.postgresService.auth.update({
        where: { id: tenant_id },
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number,
        },
      });
      return 'Update successful';
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async createTenantBusinessInfo(tenant_id: number, data: TenantBusinessDTO) {
    try {
      await this.postgresService.tenant.update({
        where: { id: tenant_id },
        data: {
          business: {
            create: {
              business_address: data.business_address,
              business_name: data.business_name,
              business_type: data.business_type,
              country: data.country,
            },
          },
        },
      });
      return 'Update successful';
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async updateTenantPersonalBusnessInfo(
    tenant_id: number,
    data: EditPersonalBusinessDTO,
  ) {
    try {
      await this.postgresService.$transaction([
        this.postgresService.auth.update({
          where: { id: tenant_id },
          data: {
            ...data.personal_info,
          },
        }),

        this.postgresService.tenant.update({
          where: { id: tenant_id },
          data: {
            business: {
              update: {
                ...data.business_info,
              },
            },
          },
        }),
      ]);
      return 'Update successful';
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async getTenantPersonalBusnessInfo(tenant_id: number) {
    try {
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
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }
}
