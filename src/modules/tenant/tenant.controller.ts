import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import {
  EditPersonalBusinessDTO,
  TenantBusinessDTO,
  TenantPersonalInfoDto,
} from './dto/tenant.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { TenantInterceptor } from '@app/common';

@ApiTags('Tenant')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post('/personal-info')
  @ApiBody({
    description: 'create tenant personal information',
    type: TenantPersonalInfoDto,
  })
  @HttpCode(HttpStatus.CREATED)
  createPersonalInfo(
    @Body() createTenantDto: TenantPersonalInfoDto,
    @Req() { tenant_id }: Request,
  ) {
    return this.tenantService.createTenantInfo(tenant_id, createTenantDto);
  }

  @Post('/business-info')
  @ApiBody({
    description: 'create tenant business information',
    type: TenantBusinessDTO,
  })
  @HttpCode(HttpStatus.CREATED)
  createBusnessInfo(
    @Body() createBusinesstDto: TenantBusinessDTO,
    @Req() { tenant_id }: Request,
  ) {
    return this.tenantService.createTenantBusinessInfo(
      tenant_id,
      createBusinesstDto,
    );
  }

  @Patch('/personal-business-info')
  @ApiBody({
    description: 'update tenant personal and business information',
    type: EditPersonalBusinessDTO,
  })
  @HttpCode(HttpStatus.OK)
  updateTenantPersonalBusnessInfo(
    @Body() updatePersonalBusiness: EditPersonalBusinessDTO,
    @Req() { tenant_id }: Request,
  ) {
    return this.tenantService.updateTenantPersonalBusnessInfo(
      tenant_id,
      updatePersonalBusiness,
    );
  }

  @Get('/personal-business-info')
  @HttpCode(HttpStatus.OK)
  getTenantPersonalBusnessInfo(@Req() { tenant_id }: Request) {
    return this.tenantService.getTenantPersonalBusnessInfo(tenant_id);
  }
}