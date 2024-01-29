import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  EditExpenseDto,
} from './dto/expense.dto';
import { TenantInterceptor } from '@app/common';
import { ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('Expense')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post('/category')
  @ApiBody({
    description: 'Create Expense Category',
    type: CreateExpenseCategoryDto,
  })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() data: CreateExpenseCategoryDto,
    @Req() { tenant_id }: Request,
  ) {
    return this.expenseService.createExpenseCategory(tenant_id, data);
  }
  @Get('categories')
  @HttpCode(HttpStatus.OK)
  getCategories(@Req() { tenant_id }: Request) {
    return this.expenseService.getAllExpenseCategories(tenant_id);
  }

  @Post('')
  @ApiBody({
    description: 'Create Expense',
    type: CreateExpenseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  createExpense(@Body() data: CreateExpenseDto, @Req() { tenant_id }: Request) {
    return this.expenseService.createExpense(tenant_id, data);
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  listExpenses(@Req() { tenant_id }: Request) {
    return this.expenseService.listExpenses(tenant_id);
  }

  @Patch(':expenseId')
  @ApiBody({
    description: 'Edit Expense',
    type: EditExpenseDto,
  })
  @HttpCode(HttpStatus.OK)
  async editExpense(
    @Param('expenseId') expenseId: number,
    @Body() body: EditExpenseDto,
    @Req() { tenant_id }: Request,
  ) {
    return this.expenseService.editExpense(tenant_id, expenseId, body);
  }

  @Get(':expenseId')
  @HttpCode(HttpStatus.OK)
  getExpense(
    @Req() { tenant_id }: Request,
    @Param('expenseId') expenseId: number,
  ) {
    return this.expenseService.getExpense(tenant_id, expenseId);
  }

  @Delete(':expenseId')
  @HttpCode(HttpStatus.OK)
  deleteExpense(
    @Req() { tenant_id }: Request,
    @Param('expenseId') expenseId: number,
  ) {
    return this.expenseService.deleteExpense(tenant_id, expenseId);
  }

  @Post('/:expenseId/duplicate')
  @HttpCode(HttpStatus.CREATED)
  duplicateExpense(
    @Param('expenseId') expenseId: number,
    @Req() { tenant_id }: Request,
  ) {
    return this.expenseService.duplicateExpense(tenant_id, expenseId);
  }
}
