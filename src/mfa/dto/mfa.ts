import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MFADto {
  @ApiProperty()
  @IsString()
  code: string;
}
