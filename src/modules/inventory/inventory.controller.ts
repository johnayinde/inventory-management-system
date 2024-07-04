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
  Get,
  Query,
  Patch,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Role, Roles, TenantInterceptor } from '@app/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CreateInventoryDto, EditInventoryDto } from './dto/inventory.dto';
import { Request } from 'express';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@Roles(Role.Inventory)
@UseInterceptors(TenantInterceptor)
@Controller('inventories')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post(':shipmentId')
  // @ApiFile('files', 10, { type: CreateInventoryDto })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createInventoryDto: CreateInventoryDto,
    @Param('shipmentId', ParseIntPipe) shipmentId: number,
    @Req() { tenant_id }: Request,
  ) {
    return this.inventoryService.create(
      createInventoryDto,
      tenant_id,
      shipmentId,
    );
  }

  // @Post('/:inventoryId/duplicate')
  // @HttpCode(HttpStatus.CREATED)
  // duplicateInventory(
  //   @Param('inventoryId', ParseIntPipe) inventoryId: number,
  //   @Req() { tenant_id }: Request,
  // ) {
  //   return this.inventoryService.duplicateInventory(tenant_id, inventoryId);
  // }

  @Get('/dashboard-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  getStats(@Req() { tenant_id }: Request, @Query('time_period') time_period) {
    return this.inventoryService.getDashboardStats(tenant_id, time_period);
  }

  @Get(':inventoryId')
  @HttpCode(HttpStatus.OK)
  getProduct(
    @Req() { tenant_id }: Request,
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
  ) {
    return this.inventoryService.getInventory(tenant_id, inventoryId);
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  getAllInventories(
    @Req() { tenant_id }: Request,
    @Query() filters: PaginatorDTO,
  ) {
    return this.inventoryService.getAllInventories(tenant_id, filters);
  }

  @Patch('/:inventoryId')
  @HttpCode(HttpStatus.OK)
  editInventory(
    @Req() { tenant_id }: Request,
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Body() data: EditInventoryDto,
  ) {
    return this.inventoryService.updateInventory(inventoryId, data, tenant_id);
  }

  @Delete('/:inventoryId')
  @HttpCode(HttpStatus.OK)
  deleteInventory(
    @Req() { tenant_id }: Request,
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
  ) {
    return this.inventoryService.deleteInventory(tenant_id, inventoryId);
  }
}
