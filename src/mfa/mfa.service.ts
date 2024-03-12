import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { authenticator } from 'otplib';
import { OrmService } from 'src/database/orm.service';
import { toFileStream } from 'qrcode';

@Injectable()
export class MfaService {
  constructor(
    private readonly configService: ConfigService,
    private readonly postgresService: OrmService,
  ) {}

  async getUserByEmail(email: string) {
    const user = await this.postgresService.auth.findUnique({
      where: {
        email,
      },
    });
    if (!user) {
      throw new HttpException('User does not exist.', HttpStatus.BAD_REQUEST);
    }
    return user;
  }
  async generateTwoFactorAuthenticationSecret(response: Response, data) {
    const user = await this.getUserByEmail(data.user.email);

    if (!user.is_mfa) {
      const secret = authenticator.generateSecret();

      const otpauthUrl = authenticator.keyuri(
        data.user.email,
        this.configService.get('TWO_FACTOR_AUTHENTICATION_APP_NAME'),
        secret,
      );

      if (!otpauthUrl) {
        throw new UnauthorizedException('Error Generatiing QRcode.');
      }

      await this.postgresService.auth.update({
        where: {
          email: data.user.email,
        },
        data: {
          mfa_secret: secret,
        },
      });

      return toFileStream(response, otpauthUrl);
    } else {
      await this.postgresService.auth.update({
        where: {
          email: data.user.email,
        },
        data: {
          mfa_secret: null,
          is_mfa: false,
        },
      });
      return 'Disabled!';
    }
  }

  async isTwoFactorAuthenticationCodeValid(code: string, data) {
    const user = await this.getUserByEmail(data.user.email);

    const isCodeValid = authenticator.verify({
      token: code,
      secret: user.mfa_secret,
    });

    if (!isCodeValid) {
      throw new UnauthorizedException('Wrong authentication code');
    }

    if (!user.is_mfa) {
      await this.postgresService.auth.update({
        where: {
          email: data.user.email,
        },
        data: {
          is_mfa: true,
        },
      });
    }
  }
}
