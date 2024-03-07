import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { CreateShipmentDto } from './dto/shipment.dto';
import { TenantInterceptor } from '@app/common';
import { ApiFile } from '@app/common/decorators/swaggerUploadField';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';

@ApiTags('Shipments')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('shipments')
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Post()
  @ApiFile('files', 10, { type: CreateShipmentDto })
  @HttpCode(HttpStatus.CREATED)
  createSgipment(
    @Body() data: CreateShipmentDto,
    @Req()
    { tenant_id }: Request,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 })],
      }),
    )
    files?: Array<Express.Multer.File>,
  ) {
    return this.shipmentService.createShipment(tenant_id, data, files);
  }

  @Get(':shipmentId')
  @HttpCode(HttpStatus.OK)
  getProduct(
    @Req() { tenant_id }: Request,
    @Param('shipmentId', ParseIntPipe) shipmentId: number,
  ) {
    return this.shipmentService.getShipment(tenant_id, shipmentId);
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  getAllSales(@Req() { tenant_id }: Request, @Query() filters: PaginatorDTO) {
    return this.shipmentService.getAllShipments(tenant_id, filters);
  }

  @Delete('/:shipmentId/files')
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @Req() { tenant_id }: Request,

    @Param('shipmentId', ParseIntPipe) shipmentId: number,
    @Query('url') url: string,
  ) {
    await this.shipmentService.deleteFile(shipmentId, url, tenant_id);
    return { message: 'File deleted successfully' };
  }
}
