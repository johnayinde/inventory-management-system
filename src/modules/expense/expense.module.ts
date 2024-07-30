import { Module } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { ImageUploadService } from '@app/common/helpers';

@Module({
  controllers: [ExpenseController],
  providers: [ExpenseService, ImageUploadService],
})
export class ExpenseModule {}
