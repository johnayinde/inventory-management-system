import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '@app/common';
import {
  LoginDto,
  OAuthDto,
  OTPDto,
  RegisterDto,
  ResetAccountDto,
  ResetPasswordDto,
  ValidateTokenDto,
} from './dto/auth.dto';
import { ApiBody, ApiQuery } from '@nestjs/swagger';

@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/register')
  @ApiBody({
    description: 'Signup new users',
    type: RegisterDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDto) {
    return this.authService.registerAccount(body);
  }

  @Post('/login')
  @ApiBody({
    description: 'login registered users',
    type: LoginDto,
  })
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.authService.loginUser(body);
  }

  @Post('/google')
  @ApiBody({
    description: 'signp/login using google Oauth',
    type: OAuthDto,
  })
  @HttpCode(HttpStatus.OK)
  async googleAuth(@Body() body: OAuthDto) {
    return this.authService.googleAuth(body);
  }

  @Post('/verify-account')
  @ApiBody({
    description: 'verify registered users',
    type: OTPDto,
  })
  @HttpCode(HttpStatus.OK)
  async verifyAccount(@Body() body: OTPDto) {
    return this.authService.verifyEmailOtp(body);
  }

  @Post('/reset-account')
  @ApiBody({
    description: 'request new password link',
    type: ResetAccountDto,
  })
  @HttpCode(HttpStatus.OK)
  async resetAccount(@Body() body: ResetAccountDto) {
    return this.authService.resetPassword(body.email);
  }

  @Post('/reset-password')
  @ApiBody({
    description: 'Reset password',
    type: ResetPasswordDto,
  })
  @ApiQuery({
    name: 'token',
    required: true,
    type: String,
  })
  @HttpCode(HttpStatus.OK)
  async resetPasword(
    @Query() data: ValidateTokenDto,
    @Body() body: ResetPasswordDto,
  ) {
    return this.authService.validateEmailForReset(data, body);
  }
}
