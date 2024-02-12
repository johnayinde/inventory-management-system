export enum Role {
  Dashboard = 'dashboard',
  Inventory = 'inventory',
  Sales = 'sales',
  Expenses = 'expenses',
  Report = 'report',
  Customers = 'customers',
}

export class SalesStatsDto {
  totalSales: number;
  totalProfits: number;
  totalExpenses: number;
  numberOfSoldProducts: number;
  returnedProducts: number;

  salesIncreasePercentage?: number;
  profitsIncreasePercentage?: number;
  expensesIncreasePercentage?: number;
  soldProductsIncreasePercentage?: number;
  returnedProductsIncreasePercentage?: number;
}

export type QuantityUpdate = {
  quantity: {
    increment?: number;
    decrement?: number;
  };
};
