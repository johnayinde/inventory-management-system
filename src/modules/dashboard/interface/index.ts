export interface AnalyticsResult {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  totalInventory: number;
  salesChangePercentage: number;
  revenueChangePercentage: number;
  profitChangePercentage: number;
  inventoryChangePercentage: number;
}
export interface TopSellingProduct {
  product: string;
  revenue: number;
  quantity: number;
}

export interface SalesOverviewData {
  date: Date;
  revenue: number;
}

export interface ProfitMarginData {
  created_at: Date;
  profitMargin: number;
}

export interface LossMarginData {
  created_at: Date;
  lossMargin: number;
}
