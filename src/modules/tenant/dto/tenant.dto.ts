import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';
import { Type } from 'class-transformer';

export class TenantPersonalInfoDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  first_name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  last_name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone_number: string;
}

export class TenantBusinessDTO {
  @ApiProperty()
  @IsString()
  @IsOptional()
  business_name: string;

  @ApiProperty({ enum: BusinessType })
  @IsString()
  @IsEnum(BusinessType)
  business_type: BusinessType;

  @ApiProperty()
  @IsString()
  @IsOptional()
  business_address: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  country: string;
}

export class EditPersonalBusinessDTO {
  @ApiPropertyOptional()
  @IsObject()
  @Type(() => TenantPersonalInfoDto)
  // @IsNotEmpty()
  personal_info: TenantPersonalInfoDto;

  @ApiPropertyOptional()
  @IsObject()
  @Type(() => TenantBusinessDTO)
  // @IsNotEmpty()
  business_info: TenantBusinessDTO;
}
