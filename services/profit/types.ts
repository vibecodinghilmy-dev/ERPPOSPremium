export interface ProfitCalculationInput {
  outletId: string
  startDate: string
  endDate: string
}

export interface ProductProfit {
  productId: string
  productName: string
  category: string
  quantitySold: number
  revenue: number
  hpp: number
  grossProfit: number
  grossMargin: number
  foodCostPercent: number
}

export interface CategoryProfit {
  category: string
  revenue: number
  hpp: number
  grossProfit: number
  grossMargin: number
  productCount: number
}

export interface DailyProfit {
  date: string
  revenue: number
  hpp: number
  grossProfit: number
  operationalCosts: number
  netProfit: number
  netMargin: number
}

export interface MonthlyProfit {
  month: string
  revenue: number
  hpp: number
  grossProfit: number
  operationalCosts: number
  netProfit: number
  netMargin: number
  foodCostPercent: number
  transactionCount: number
}

export interface YearlyProfit {
  year: number
  revenue: number
  hpp: number
  grossProfit: number
  operationalCosts: number
  netProfit: number
  netMargin: number
  months: MonthlyProfit[]
}

export interface OutletProfitSummary {
  outletId: string
  outletName: string
  totalRevenue: number
  totalHPP: number
  totalGrossProfit: number
  totalOperationalCosts: number
  totalNetProfit: number
  grossMargin: number
  netMargin: number
  foodCostPercent: number
  productProfits: ProductProfit[]
  categoryProfits: CategoryProfit[]
  dailyProfits: DailyProfit[]
}

export interface ProfitSnapshot {
  id: string
  outletId: string
  saleId: string
  saleNumber: string
  revenue: number
  hpp: number
  grossProfit: number
  operationalCosts: number
  netProfit: number
  productBreakdown: Array<{
    productId: string
    productName: string
    quantity: number
    revenue: number
    hppAtSale: number
    profit: number
  }>
  calculatedAt: string
}