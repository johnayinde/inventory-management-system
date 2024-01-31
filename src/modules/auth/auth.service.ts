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
import { REGISTEROTP, decryption, encryptData } from '@app/common';
import { EmailService } from '../email/email.service';
import { CacheService } from '../cache/cache.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  constructor(
    readonly postgresService: OrmService,
    readonly emailService: EmailService,
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
    try {
      const userNotVerified = await this.postgresService.auth.findFirst({
        where: {
          email: data.email,
          email_verified: false,
        },
      });

      if (userNotVerified) {
        const otp = await this.cache.setOTPValue(data.email);
        await this.emailService.sendOTP(otp, data.email);
        return REGISTEROTP;
      } else {
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
      }
      return REGISTEROTP;
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async loginUser(data: LoginDto) {
    try {
      const user = await this.getUserByEmail(data.email);

      const isMatch = await bcrypt.compare(data.password, user.password);

      if (!isMatch) {
        throw new HttpException(
          'Email or password is incorrect',
          HttpStatus.FORBIDDEN,
        );
      }

      if (user.email_verified !== true) {
        const otp = await this.cache.setOTPValue(data.email);
        await this.emailService.sendOTP(otp, data.email);
        return user;
      }
      let userId: number;

      if (user.isUser) {
        const userRec = await this.postgresService.user.findFirst({
          where: { email: user.email },
        });
        userId = userRec.id;
      } else {
        userId = user.id;
      }

      delete user.password;
      return {
        ...user,
        token: await this.generateAccessToken(userId, user.email, user.isUser),
      };
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async googleAuth(dto: OAuthDto) {
    try {
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
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async verifyEmailOtp(data: OTPDto) {
    try {
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

      return 'Your email has been verified, please continue with your registration process';
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  async resetPassword(email: string) {
    try {
      const user = await this.getUserByEmail(email);

      const data = await this.emailService.sendResetPasswordToEmail(user.email);
      this.cache.setData(data.encryptedText, data);

      return `An OTP has been sent to your registered email address.`;
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
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
