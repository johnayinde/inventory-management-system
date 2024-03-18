import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { MfaService } from './mfa.service';
import { Response } from 'express';
import { TenantInterceptor } from '@app/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MFADto } from './dto/mfa';

@ApiTags('MFA')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Post('generate')
  async register(@Res() response: Response, @Req() data: Request) {
    return await this.mfaService.generateTwoFactorAuthenticationSecret(
      response,
      data,
    );
  }

  @Post('authenticate')
  @HttpCode(200)
  async authenticate(@Req() data: Request, @Body() { code }: MFADto) {
    return await this.mfaService.isTwoFactorAuthenticationCodeValid(code, data);
  }
}
