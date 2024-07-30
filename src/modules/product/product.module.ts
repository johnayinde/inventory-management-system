import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ImageUploadService } from '@app/common/helpers';

@Module({
  controllers: [ProductController],
  providers: [ProductService, ImageUploadService],
})
export class ProductModule {}
