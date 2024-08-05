import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateFeeDto, EditFeeDto } from './dto/fees.dto';
import { FeeType } from '@prisma/client';

@Injectable()
export class FeesService {
  constructor(private readonly prismaService: OrmService) {}

  async create(tenant_id: number, data: CreateFeeDto) {
    const { products_ids, fee_type, ...restData } = data;
    if (products_ids?.length && fee_type === FeeType.product) {
      await this.catchInvalidProducts(products_ids, tenant_id);
      return await this.prismaService.fees.create({
        data: {
          ...restData,
          fee_type,
          products: {
            connect: products_ids.map((id) => ({ id })),
          },
          tenant: { connect: { id: tenant_id } },
        },
        include: { products: true },
      });
    } else if (fee_type === FeeType.all) {
      return await this.prismaService.fees.create({
        data: {
          ...restData,
          fee_type,
          tenant: { connect: { id: tenant_id } },
        },
        include: { products: true },
      });
    } else {
      throw new BadRequestException('kindly select the appropriate field');
    }
  }

  async edit(tenant_id: number, id: number, data: EditFeeDto) {
    const fee = await this.prismaService.fees.findFirst({
      where: { id, tenant_id },
    });
    if (!fee) {
      throw new NotFoundException('Fees not found');
    }

    const { products_ids, ...restData } = data;

    if (data.fee_type == FeeType.all) {
      return await this.prismaService.fees.update({
        where: { id, tenant_id },
        data: {
          ...restData,
        },
      });
    } else if (data.fee_type == FeeType.product) {
      if (!products_ids.length) {
        throw new BadRequestException('Select product(s)');
      }
      await this.catchInvalidProducts(products_ids, tenant_id);
      return await this.prismaService.fees.update({
        where: { id, tenant_id },
        data: {
          ...restData,
          products: {
            set: products_ids.map((id) => ({ id })),
          },
        },
      });
    }
  }

  private async catchInvalidProducts(
    products_ids: number[],
    tenant_id: number,
  ) {
    const products = await this.prismaService.product.findMany({
      where: { id: { in: products_ids }, tenant_id },
      select: { id: true },
    });

    const foundProductIds = products.map((product) => product.id);
    const missingProductIds = products_ids.filter(
      (id) => !foundProductIds.includes(id),
    );

    if (missingProductIds.length > 0) {
      throw new BadRequestException(
        `Products with IDs ${missingProductIds.join(', ')} not found`,
      );
    }
  }

  async getAllFees(tenant_id: number) {
    return await this.prismaService.fees.findMany({
      where: { tenant_id: tenant_id },
      include: { products: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async deleteFee(tenant_id: number, id: number) {
    const deletedFee = await this.prismaService.fees.delete({
      where: { id, tenant_id },
    });
    if (!deletedFee) {
      throw new NotFoundException('Fee not found');
    }
    return deletedFee;
  }
}
