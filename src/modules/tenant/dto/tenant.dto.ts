import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';
import { Type } from 'class-transformer';

export class TenantPersonalInfoDto {
  @ApiProperty()
  @IsString()
  first_name: string;

  @ApiProperty()
  @IsString()
  last_name: string;

  @ApiProperty()
  @IsString()
  phone_number: string;
}

export class TenantBusinessDTO {
  @ApiProperty()
  @IsString()
  business_name: string;

  @ApiProperty({ enum: BusinessType })
  @IsString()
  @IsEnum(BusinessType)
  business_type: BusinessType;

  @ApiProperty()
  @IsString()
  business_address: string;

  @ApiProperty()
  @IsString()
  country: string;
}

export class EditPersonalBusinessDTO {
  @ApiPropertyOptional()
  @IsObject()
  @Type(() => TenantPersonalInfoDto)
  @IsNotEmpty()
  personal_info: TenantPersonalInfoDto;

  @ApiPropertyOptional()
  @IsObject()
  @Type(() => TenantBusinessDTO)
  @IsNotEmpty()
  business_info: TenantBusinessDTO;
}
