import {
  IsEmail,
  IsHexadecimal,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RecordIsInDb } from '@app/common';
import { CheckPassword } from '../decorators/pwd.valid.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty()
  @MinLength(8)
  @MaxLength(20)
  @IsString()
  @CheckPassword('auth.password')
  password: string;

  @ApiProperty()
  @MinLength(8)
  @MaxLength(20)
  @IsString()
  @IsOptional()
  @CheckPassword('auth.password')
  confirm_password: string;
}

export class OTPDto {
  @ApiProperty()
  @IsString()
  @IsEmail()
  @RecordIsInDb('auth.email')
  email: string;

  @ApiProperty()
  @IsString()
  otp: string;
}

export class LoginDto {
  @ApiProperty()
  @IsString()
  @IsEmail()
  @RecordIsInDb('auth.email')
  email: string;

  @ApiProperty()
  @MinLength(8)
  @MaxLength(20)
  @IsString()
  // @CheckPassword('auth.password')
  password: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @MinLength(8)
  @MaxLength(20)
  @IsString()
  @CheckPassword('auth.password')
  password: string;

  @ApiProperty()
  @MinLength(8)
  @MaxLength(20)
  @IsString()
  confirm_password: string;
}

export class ResetAccountDto {
  @ApiProperty()
  @IsString()
  @IsEmail()
  @RecordIsInDb('auth.email')
  email: string;
}

export class ValidateTokenDto {
  @IsString()
  @IsHexadecimal()
  token: string;
}

export class OAuthDto {
  @IsString()
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class ChangePasswordDTO {
  @ApiProperty()
  current_password: string;

  @ApiProperty()
  @MinLength(8)
  @MaxLength(20)
  @IsString()
  @CheckPassword('auth.password')
  password: string;

  @ApiProperty()
  @MinLength(8)
  @MaxLength(20)
  @IsString()
  @CheckPassword('auth.password')
  confirm_password: string;
}
