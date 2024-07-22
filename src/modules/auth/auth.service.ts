import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { OrmService } from 'src/database/orm.service';
import {
  LoginDto,
  OAuthDto,
  OTPDto,
  RegisterDto,
  ResetPasswordDto,
  ValidateTokenDto,
} from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import {
  NOTACTIVATED,
  REGISTEROTP,
  decryption,
  encryptData,
} from '@app/common';
import { EmailService } from '../email/email.service';
import { CacheService } from '../cache/cache.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StatusType } from '@prisma/client';
import { TenantService } from '../tenant/tenant.service';
import { comparePasswordString, hashPassword } from '@app/common/helpers';

@Injectable()
export class AuthService {
  constructor(
    readonly postgresService: OrmService,
    readonly emailService: EmailService,
    readonly tenantService: TenantService,
    private readonly cache: CacheService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateAccessToken(
    userId: number,
    email: string,
    isUser: boolean,
  ): Promise<string> {
    const token = await this.jwtService.signAsync(
      {
        email,
        userId,
        isUser,
      },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_ACCEESS_EXPIRES_IN'),
      },
    );
    return token;
  }

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
  async registerAccount(data: RegisterDto) {
    const user = await this.postgresService.auth.findUnique({
      where: {
        email: data.email,
      },
    });

    if (user) {
      throw new HttpException('User Already exist.', HttpStatus.BAD_REQUEST);
    }
    await comparePasswordString(data.password, data.confirm_password);

    data.password = await hashPassword(data.password);
    const new_account = await this.postgresService.auth.create({
      data: {
        email: data.email,
        password: data.password,
        is_super_admin: true,
      },
    });

    if (!new_account) {
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.postgresService.permission.create({
      data: {
        dashboard: true,
        customers: true,
        expenses: true,
        inventory: true,
        report: true,
        sales: true,
        user_auth: { connect: { id: new_account.id } },
      },
    });

    const otp = await this.cache.setOTPValue(data.email);
    await this.emailService.sendOTP(otp, data.email);
    return REGISTEROTP;
  }

  async loginUser(data: LoginDto) {
    const user = await this.postgresService.auth.findUnique({
      where: {
        email: data.email,
      },
    });

    if (user.email_verified !== true) {
      const otp = await this.cache.setOTPValue(data.email);
      await this.emailService.sendOTP(otp, data.email);
      throw new HttpException(NOTACTIVATED, HttpStatus.FORBIDDEN);
    }

    const isMatch = await bcrypt.compare(data.password, user.password);

    if (!isMatch) {
      throw new HttpException(
        'Email or password is incorrect',
        HttpStatus.BAD_REQUEST,
      );
    }

    let userId: number;

    if (user.is_user) {
      const userRec = await this.postgresService.user.findFirst({
        where: { email: user.email },
      });
      if (userRec.is_suspended) {
        throw new UnauthorizedException('Account is Suspended!');
      }
      await this.postgresService.user.update({
        where: { id: userRec.id },
        data: { last_login: new Date() },
      });
      userId = userRec.id;
    } else {
      userId = user.id;
    }

    delete user.password;
    delete user.mfa_secret;

    if (user.is_user) {
      return {
        ...user,
        is_profile_complete: true,
        token: await this.generateAccessToken(userId, user.email, user.is_user),
      };
    }

    const { personal, business } =
      await this.tenantService.getTenantPersonalBusnessInfo(user.email);

    const is_profile_complete = !!business.business && !!personal.first_name;

    return {
      ...user,
      is_profile_complete,
      token: await this.generateAccessToken(userId, user.email, user.is_user),
    };
  }

  async googleAuth(dto: OAuthDto) {
    const { email } = dto;
    const existing_user = await this.postgresService.auth.findUnique({
      where: {
        email,
      },
    });
    let auth_user = existing_user;

    if (!existing_user) {
      const new_user = await this.postgresService.auth.create({
        data: {
          email,
          email_verified: true,
          is_super_admin: true,
          is_oauth_user: true,
        },
      });

      await this.postgresService.permission.create({
        data: {
          dashboard: true,
          customers: true,
          expenses: true,
          inventory: true,
          report: true,
          sales: true,
          user_auth: { connect: { id: new_user.id } },
        },
      });

      await this.postgresService.tenant.create({
        data: {
          email: new_user.email,
        },
      });
      auth_user = new_user;
    }

    const business_info = await this.postgresService.tenant.findFirst({
      where: { email },
      include: { business: true },
    });

    const is_profile_complete =
      !!business_info.business && !!auth_user.first_name;
    console.log({ is_profile_complete });

    delete auth_user.password;
    delete auth_user.mfa_secret;

    return {
      ...auth_user,
      is_profile_complete,
      token: await this.generateAccessToken(
        auth_user.id,
        auth_user.email,
        auth_user.is_user,
      ),
    };
  }

  async verifyEmailOtp(data: OTPDto) {
    const cached_value = await this.cache.getOTPValue(data.email);

    if (!cached_value) {
      throw new HttpException(
        'Seems, you have provided an Invalid OTP, please retry again',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (cached_value !== data.otp) {
      throw new HttpException('Invalid OTP Provided', HttpStatus.BAD_REQUEST);
    }

    const user = await this.getUserByEmail(data.email);

    await this.postgresService.$transaction([
      this.postgresService.auth.update({
        where: {
          email: data.email,
        },
        data: {
          email_verified: true,
        },
      }),

      this.postgresService.tenant.create({
        data: {
          email: user.email,
        },
      }),
    ]);
    await this.cache.deleteOTPValue(data.email);

    return 'Your email has been verified, please continue with onbording process';
  }

  async resetPassword(email: string) {
    const user = await this.getUserByEmail(email);

    const data = await this.emailService.sendResetPasswordToEmail(email, {
      is_user_flag: false,
      data: { ...user, user_permissions: null },
    });
    this.cache.setData(data.encryptedText, data);

    return `Reset Link sent to your registered email address.`;
  }

  async validateEmailForReset(token: ValidateTokenDto, body: ResetPasswordDto) {
    const data = await this.cache.getData(token.token);
    if (!data) {
      throw new BadRequestException('Verification failed, Please try again');
    }

    const {
      is_user_flag,
      data: { email, id: user_auth_id, user_permissions },
    } = decryption(data as encryptData);

    if (is_user_flag) {
      const account = await this.postgresService.user.findFirst({
        where: { email },
      });

      if (!account) {
        throw new UnauthorizedException(`Invalid Process, please try again`);
      }
      await comparePasswordString(body.password, body.confirm_password);

      const new_password = await hashPassword(body.password);

      await this.postgresService.auth.update({
        where: {
          email,
        },
        data: {
          password: new_password,
          email_verified: true,
          is_user: true,
        },
      });

      await this.postgresService.permission.create({
        data: {
          ...user_permissions,
          user_auth: { connect: { id: user_auth_id } },
          user: { connect: { id: account.id } },
        },
      });
      await this.postgresService.user.update({
        where: { id: account.id, tenant_id: account.tenant_id },
        data: {
          status: StatusType.active,
        },
      });

      this.cache.delData(token.token);

      return await this.getUserByEmail(email);
    } else {
      const account = await this.getUserByEmail(email);
      if (!account) {
        throw new UnauthorizedException(`Invalid Process, please try again`);
      }
      await comparePasswordString(body.password, body.confirm_password);

      const new_password = await hashPassword(body.password);

      await this.postgresService.auth.update({
        where: {
          email,
        },
        data: {
          password: new_password,
        },
      });
      this.cache.delData(token.token);
      return await this.getUserByEmail(email);
    }
  }
}
