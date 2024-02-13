import { Module } from '@nestjs/common';
import { SaleService } from './sale.service';
import { SaleController } from './sale.controller';
import { OrmService } from 'src/database/orm.service';

@Module({
  controllers: [SaleController],
  providers: [SaleService],
})
export class SaleModule {}
