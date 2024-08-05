import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { ImageUploadService } from '@app/common/helpers/';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, ImageUploadService],
})
export class InventoryModule {}
