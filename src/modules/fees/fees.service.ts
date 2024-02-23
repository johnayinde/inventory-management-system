import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import { CreateFeeDto, EditFeeDto } from './dto/fees.dto';
import { ExpenseType, FeeType } from '@prisma/client';
import { EditExpenseDto } from '../expense/dto/expense.dto';

@Injectable()
export class FeesService {
  constructor(private readonly prismaService: OrmService) {}

  async create(tenant_id: number, data: CreateFeeDto) {
    const { products_ids, ...restData } = data;
    if (products_ids?.length) {
      return await this.prismaService.fees.create({
        data: {
          ...restData,
          products: {
            connect: products_ids.map((id) => ({ id })),
          },
          tenant: { connect: { id: tenant_id } },
        },
        include: { products: true },
      });
    }
    return await this.prismaService.fees.create({
      data: {
        ...data,
        tenant: { connect: { id: tenant_id } },
      },
      include: { products: true },
    });
  }

  async edit(tenant_id: number, id: number, data: EditFeeDto) {
    const fee = await this.prismaService.fees.findFirst({
      where: { id, tenant_id },
    });
    if (!fee) {
      throw new NotFoundException('Fees not found');
    }

    const { products_ids, ...restData } = data;

    if (fee.fee_type == FeeType.all) {
      return await this.prismaService.fees.update({
        where: { id, tenant_id },
        data: {
          ...restData,
        },
      });
    } else if (fee.fee_type == FeeType.product) {
      if (!products_ids.length) {
        throw new BadRequestException('Select product(s)');
      }
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

  async getAllFees(tenant_id: number) {
    return await this.prismaService.fees.findMany({
      where: { tenant_id: tenant_id },
      include: { products: true },
    });
  }
}
