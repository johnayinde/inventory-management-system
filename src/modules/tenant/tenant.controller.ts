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
  Put,
  MaxFileSizeValidator,
  ParseFilePipe,
  UploadedFiles,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import {
  EditPersonalBusinessDTO,
  TenantBusinessDTO,
  TenantPersonalInfoDto,
} from './dto/tenant.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiFile, TenantInterceptor } from '@app/common';
import { ChangePasswordDTO } from '../auth/dto/auth.dto';

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
  @ApiFile('files', 1, { type: EditPersonalBusinessDTO })
  @HttpCode(HttpStatus.OK)
  updateTenantPersonalBusnessInfo(
    @Body() updatePersonalBusiness: EditPersonalBusinessDTO,
    @Req() { tenant_id, user }: Request,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
      }),
    )
    files?: Array<Express.Multer.File>,
  ) {
    return this.tenantService.updateTenantPersonalBusnessInfo(
      tenant_id,
      user,
      updatePersonalBusiness,
      files,
    );
  }

  @Get('/user-info')
  @HttpCode(HttpStatus.OK)
  getTenantData(@Req() { tenant_id, user }: Request) {
    return this.tenantService.getTenantInfo(tenant_id, user);
  }

  @Put('change-password')
  async changePassword(
    @Req() { user }: Request,
    @Body() data: ChangePasswordDTO,
  ): Promise<void> {
    return await this.tenantService.changePassword(user, data);
  }
}
