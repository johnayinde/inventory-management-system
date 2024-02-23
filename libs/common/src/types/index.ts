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
export class InventoryStatsDto {
  totalGoods: number;
  goodsPercentageChange: number;
  totalCategories: number;
  categoriesPercentageChange: number;
  totalReturnedProducts: number;
  returnPercentageChange: number;
  totalLowStocks: number;
}

export class ProductStatsDto {
  totalProducts: number;
  productsPercentageChange: number;
  totalCategories: number;
  categoriesPercentageChange: number;
  totalSubcategories: number;
  subcategoriesPercentageChange: number;
  totalLowStocks: number;
}

export class ExpenseStatsDto {
  totalExpenses: number;
  totalShipping: number;
  totalFees: number;
  miscelleneous: number;

  totalExpensesChange: number;
  totalShippingChange: number;
  totalFeesChange: number;
  miscelleneousChange: number;
}

export type QuantityUpdate = {
  quantity: {
    increment?: number;
    decrement?: number;
  };
};
