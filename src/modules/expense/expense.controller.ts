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
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  EditExpenseDto,
} from './dto/expense.dto';
import { ApiFile, Role, Roles, TenantInterceptor } from '@app/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { PaginatorDTO } from '@app/common/pagination/pagination.dto';

@ApiTags('Expense')
@ApiBearerAuth()
@Roles(Role.Expenses)
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
  @ApiFile('files', 3, { type: CreateExpenseDto })
  @HttpCode(HttpStatus.CREATED)
  createExpense(
    @Body() data: CreateExpenseDto,
    @Req() { tenant_id }: Request,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })],
      }),
    )
    files?: Array<Express.Multer.File>,
  ) {
    return this.expenseService.createExpense(tenant_id, data, files);
  }

  @Get('card-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  async getStats(
    @Query('time_period') time_period,
    @Req() { tenant_id }: Request,
  ) {
    return this.expenseService.getExpenseDashboardStats(tenant_id, time_period);
  }

  @Get('/expense-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  expenseStats(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.expenseService.calculateExpenseStats(tenant_id, time_period);
  }

  @Get('/top-expense-stats')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'time_period', required: false })
  topExpenseStats(
    @Req() { tenant_id }: Request,
    @Query('time_period') time_period,
  ) {
    return this.expenseService.topExpenses(tenant_id, time_period);
  }

  @Get(':expenseId')
  @HttpCode(HttpStatus.OK)
  getExpense(
    @Req() { tenant_id }: Request,
    @Param('expenseId', ParseIntPipe) expenseId: number,
  ) {
    return this.expenseService.getExpense(tenant_id, expenseId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  listExpenses(@Req() { tenant_id }: Request, @Query() filters: PaginatorDTO) {
    return this.expenseService.listExpenses(tenant_id, filters);
  }

  @Patch(':expenseId')
  @ApiFile('files', 3, { type: EditExpenseDto })
  @HttpCode(HttpStatus.OK)
  async editExpense(
    @Param('expenseId', ParseIntPipe) expenseId: number,
    @Body() body: EditExpenseDto,
    @Req() { tenant_id }: Request,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })],
      }),
    )
    files: Array<Express.Multer.File>,
  ) {
    return this.expenseService.editExpense(tenant_id, expenseId, files, body);
  }

  @Delete(':expenseId')
  @HttpCode(HttpStatus.OK)
  deleteExpense(
    @Req() { tenant_id }: Request,
    @Param('expenseId', ParseIntPipe) expenseId: number,
  ) {
    return this.expenseService.deleteExpense(tenant_id, expenseId);
  }

  @Delete('/:expenseId/files')
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @Req() { tenant_id }: Request,

    @Param('expenseId', ParseIntPipe) expenseId: number,
    @Query('url') url: string,
  ) {
    await this.expenseService.deleteFile(expenseId, url, tenant_id);
    return { message: 'File deleted successfully' };
  }

  @Post('/:expenseId/duplicate')
  @HttpCode(HttpStatus.CREATED)
  duplicateExpense(
    @Param('expenseId', ParseIntPipe) expenseId: number,
    @Req() { tenant_id }: Request,
  ) {
    return this.expenseService.duplicateExpense(tenant_id, expenseId);
  }
}
