import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiTags, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { CreateUserDto, EditUserDto, SuspendUserDto } from './dto/user.dto';
import { Request } from 'express';
import { ResetPasswordDto, ValidateTokenDto } from '../auth/dto/auth.dto';
import { Public, TenantInterceptor } from '@app/common';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @ApiBearerAuth()
  @UseInterceptors(TenantInterceptor)
  @Post('')
  @ApiBody({
    description: 'create User by tenant',
    type: CreateUserDto,
  })
  @HttpCode(HttpStatus.CREATED)
  createUser(
    @Body() createUserDto: CreateUserDto,
    @Req() { tenant_id }: Request,
  ) {
    return this.userService.createUser(tenant_id, createUserDto);
  }

  @Public()
  @Post('/reset-password')
  @ApiBody({
    description: 'set password for new user',
    type: ResetPasswordDto,
  })
  @ApiQuery({
    name: 'token',
    required: true,
    type: String,
  })
  @HttpCode(HttpStatus.OK)
  async setAccount(
    @Query() token: ValidateTokenDto,

    @Body() body: ResetPasswordDto,
  ) {
    return this.userService.validateEmailForPassword(token, body);
  }

  @ApiBearerAuth()
  @UseInterceptors(TenantInterceptor)
  @Patch(':userId/suspend')
  @ApiBody({
    description: 'set user suspension status',
    type: SuspendUserDto,
  })
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() { flag }: SuspendUserDto,
    @Req() { tenant_id }: Request,
  ) {
    return this.userService.suspendUser(tenant_id, userId, flag);
  }

  @ApiBearerAuth()
  @UseInterceptors(TenantInterceptor)
  @Patch(':userId/revoke')
  @ApiBody({
    description: 'set user suspension status',
    type: SuspendUserDto,
  })
  @HttpCode(HttpStatus.OK)
  async revokeUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() { flag }: SuspendUserDto,
    @Req() { tenant_id }: Request,
  ) {
    return this.userService.revokeUser(tenant_id, userId, flag);
  }

  @ApiBearerAuth()
  @UseInterceptors(TenantInterceptor)
  @Patch(':userId')
  @ApiBody({
    description: 'Edit User',
    type: EditUserDto,
  })
  @HttpCode(HttpStatus.OK)
  async editUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: EditUserDto,
    @Req() { tenant_id }: Request,
  ) {
    return this.userService.editUser(tenant_id, userId, body);
  }

  @ApiBearerAuth()
  @UseInterceptors(TenantInterceptor)
  @Get('')
  @HttpCode(HttpStatus.OK)
  getAllUsers(@Req() { tenant_id }: Request) {
    return this.userService.getAllTenantUsers(tenant_id);
  }

  @ApiBearerAuth()
  @UseInterceptors(TenantInterceptor)
  @Get('/:userId')
  @HttpCode(HttpStatus.OK)
  getUserById(
    @Req() { tenant_id }: Request,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.userService.getUserById(tenant_id, userId);
  }
}
