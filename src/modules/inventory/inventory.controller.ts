import {
  Controller,
  Post,
  Body,
  Param,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Req,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { TenantInterceptor } from '@app/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CreateInventoryDto } from './dto/inventory.dto';
import { Request } from 'express';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('inventories')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('')
  @ApiBody({
    description: 'Create Inventory',
    type: CreateInventoryDto,
  })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createInventoryDto: CreateInventoryDto,
    @Req() { tenant_id }: Request,
  ) {
    return this.inventoryService.create(createInventoryDto, tenant_id);
  }

  @Post('/:inventoryId/duplicate')
  @HttpCode(HttpStatus.CREATED)
  duplicateInventory(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Req() { tenant_id }: Request,
  ) {
    return this.inventoryService.duplicateInventory(tenant_id, inventoryId);
  }

  @Delete('/:inventoryId')
  @HttpCode(HttpStatus.OK)
  deleteSales(
    @Req() { tenant_id }: Request,
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
  ) {
    return this.inventoryService.deleteInventory(tenant_id, inventoryId);
  }
}
