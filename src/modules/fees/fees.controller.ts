import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { FeesService } from './fees.service';
import { CreateFeeDto, EditFeeDto } from './dto/fees.dto';
import { TenantInterceptor } from '@app/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('Fees')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post('')
  @ApiBody({
    description: 'Create Fees',
    type: CreateFeeDto,
  })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() feeData: CreateFeeDto, @Req() { tenant_id }: Request) {
    return this.feesService.create(tenant_id, feeData);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getCategories(@Req() { tenant_id }: Request) {
    return this.feesService.getAllFees(tenant_id);
  }

  @Patch(':feeId')
  @ApiBody({
    description: 'Edit Expense',
    type: EditFeeDto,
  })
  @HttpCode(HttpStatus.OK)
  async editExpense(
    @Param('feeId', ParseIntPipe) feeId: number,
    @Body() body: EditFeeDto,
    @Req() { tenant_id }: Request,
  ) {
    return this.feesService.edit(tenant_id, feeId, body);
  }
}
