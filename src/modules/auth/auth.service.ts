import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
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
import { OAuth2Client } from 'google-auth-library';
import { StatusType } from '@prisma/client';
import { TenantService } from '../tenant/tenant.service';

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

  async hashPassword(password: string) {
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);

    return hashedPassword;
  }
  async comparePassword(pwd: string, cPwd: string) {
    const isMatch = pwd == cPwd;
    if (!isMatch) {
      throw new HttpException(
        'Password does not match',
        HttpStatus.BAD_GATEWAY,
      );
    }
    return isMatch;
  }

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
    await this.comparePassword(data.password, data.confirm_password);

    data.password = await this.hashPassword(data.password);
    const new_account = await this.postgresService.auth.create({
      data: {
        email: data.email,
        password: data.password,
      },
    });

    if (!new_account) {
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

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
      throw new HttpException(NOTACTIVATED, HttpStatus.BAD_REQUEST);
    }

    const isMatch = await bcrypt.compare(data.password, user.password);

    if (!isMatch) {
      throw new HttpException(
        'Email or password is incorrect',
        HttpStatus.FORBIDDEN,
      );
    }

    let userId: number;

    if (user.isUser) {
      const userRec = await this.postgresService.user.findFirst({
        where: { email: user.email },
      });
      if (userRec.is_suspended) {
        throw new UnauthorizedException('Account is Suspended!');
      }
      await this.postgresService.user.update({
        where: { id: userRec.id },
        data: { last_login: new Date(), status: StatusType.online },
      });
      userId = userRec.id;
    } else {
      userId = user.id;
    }

    const { personal, business } =
      await this.tenantService.getTenantPersonalBusnessInfo(user.email);
    const is_profile_complete =
      !!business?.business.id && !!personal.first_name;

    delete user.password;
    delete user.mfa_secret;
    return {
      ...user,
      is_profile_complete,
      token: await this.generateAccessToken(userId, user.email, user.isUser),
    };
  }

  async googleAuth(dto: OAuthDto) {
    const client = new OAuth2Client(
      await this.configService.get('GOOGLE_CLIENT_ID'),
      await this.configService.get('GOOGLE_CLIENT_SECRET'),
      'postmessage',
    );

    const getTokenFromCLient = await client.getToken(dto.token);

    const verifyClientToken = await client.verifyIdToken({
      idToken: getTokenFromCLient.tokens.id_token,
      audience: await this.configService.get('GOOGLE_CLIENT_ID'),
    });
    const { email } = verifyClientToken.getPayload();

    const existing_user = await this.postgresService.auth.findUnique({
      where: {
        email,
      },
    });

    if (!existing_user) {
      return this.postgresService.$transaction(async (tx) => {
        // Code running in a transaction...
        const user = await tx.auth.create({
          data: {
            email,
            email_verified: true,
          },
        });

        await this.postgresService.tenant.create({
          data: {
            email: user.email,
          },
        });

        return {
          ...user,
          token: this.generateAccessToken(user.id, user.email, user.isUser),
        };
      });
    } else {
      return {
        ...existing_user,
        token: this.generateAccessToken(
          existing_user.id,
          existing_user.email,
          existing_user.isUser,
        ),
      };
    }
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

    const data = await this.emailService.sendResetPasswordToEmail(user.email);
    this.cache.setData(data.encryptedText, data);

    return `Reset Link sent to your registered email address.`;
  }

  async validateEmailForReset(token: ValidateTokenDto, body: ResetPasswordDto) {
    const data = await this.cache.getData(token.token);
    if (!data) {
      throw new BadRequestException('Verification failed, Please try again');
    }
    const user = decryption(data as encryptData);
    const account = this.getUserByEmail(user);
    if (!account) {
      throw new UnauthorizedException(`Invalid Process, please try again`);
    }
    await this.comparePassword(body.password, body.confirm_password);

    const new_password = await this.hashPassword(body.password);

    await this.postgresService.auth.update({
      where: {
        email: user,
      },
      data: {
        password: new_password,
      },
    });
    this.cache.delData(token.token);
    return 'New password saved!';
  }
}
