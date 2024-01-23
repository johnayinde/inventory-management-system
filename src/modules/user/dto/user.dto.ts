import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RecordExists } from '@app/common';

export class UserPermissionDto {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  dashboard: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  inventory: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  sales: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  expenses: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  report: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  customers: boolean;
}

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  @IsEmail()
  @RecordExists('user.email')
  @RecordExists('auth.email')
  email: string;

  @ApiProperty({ type: UserPermissionDto, required: false })
  @ValidateNested({ each: true })
  @Type(() => UserPermissionDto)
  @IsOptional()
  permissions: UserPermissionDto;
}

export class EditUserDto {
  @ApiPropertyOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: UserPermissionDto, required: false })
  @ValidateNested({ each: true })
  @Type(() => UserPermissionDto)
  @IsOptional()
  permissions?: UserPermissionDto;
}

export class SuspendUserDto {
  @ApiProperty()
  @IsBoolean()
  flag: boolean;
}
