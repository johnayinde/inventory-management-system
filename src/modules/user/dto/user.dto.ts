import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum UserEnum {
  DELETED = 'DELETED',
  REVOKED = 'REVOKED',
  INVITED = 'INVITED',
}
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

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  product: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  settings: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  shipment: boolean;
}

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({ type: UserPermissionDto, required: false })
  @ValidateNested({ each: true })
  @Type(() => UserPermissionDto)
  @IsOptional()
  permissions: UserPermissionDto;
}

export class EditUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: UserPermissionDto, required: false })
  @ValidateNested({ each: true })
  @Type(() => UserPermissionDto)
  @IsOptional()
  permissions?: UserPermissionDto;
}

export class UserActions {
  @ApiProperty({ enum: UserEnum, example: 'DELETED | REVOKED | INVITED' })
  @IsEnum(UserEnum)
  action: UserEnum;
}
