import { Module } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { ShipmentController } from './shipment.controller';

@Module({
  controllers: [ShipmentController],
  providers: [ShipmentService]
})
export class ShipmentModule {}
