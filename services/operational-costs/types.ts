export type CostCategory = 'rent' | 'electricity' | 'water' | 'internet' | 'salary' | 'marketing' | 'maintenance' | 'equipment' | 'other'

export interface OperationalCostInput {
  outletId: string
  category: CostCategory
  amount: number
  date: string
  notes?: string
  createdBy?: string
}

export interface OperationalCostRecord {
  id: string
  outlet_id: string
  category: CostCategory
  amount: number
  date: string
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface CostSummary {
  category: CostCategory
  total: number
  percentage: number
  count: number
}

export interface MonthlyCostReport {
  month: string
  totalCost: number
  categories: CostSummary[]
  dailyAverage: number
}

export interface CostTrend {
  month: string
  total: number
  categories: Record<string, number>
}