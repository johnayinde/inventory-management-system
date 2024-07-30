import { Module } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { ShipmentController } from './shipment.controller';
import { ImageUploadService } from '@app/common/helpers';

@Module({
  controllers: [ShipmentController],
  providers: [ShipmentService, ImageUploadService],
})
export class ShipmentModule {}
