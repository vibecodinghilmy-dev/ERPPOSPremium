// ============================================================================
// Operational Cost Engine
// Tracks: Rent, Electricity, Water, Internet, Salary, Marketing, Maintenance, Equipment
// Integrates into Net Profit calculations via ProfitEngine
// ============================================================================

import { supabase } from '../../src/lib/supabase'
import type {
  OperationalCostInput,
  OperationalCostRecord,
  CostSummary,
  MonthlyCostReport,
  CostTrend,
  CostCategory,
} from './types'

const ALL_CATEGORIES: CostCategory[] = [
  'rent', 'electricity', 'water', 'internet', 'salary',
  'marketing', 'maintenance', 'equipment', 'other',
]

const CATEGORY_LABELS: Record<CostCategory, string> = {
  rent: 'Rent',
  electricity: 'Electricity',
  water: 'Water',
  internet: 'Internet',
  salary: 'Salary',
  marketing: 'Marketing',
  maintenance: 'Maintenance',
  equipment: 'Equipment',
  other: 'Other',
}

export class OperationalCostEngine {
  /**
   * Record a new operational cost
   */
  async recordCost(input: OperationalCostInput): Promise<OperationalCostRecord> {
    const { data, error } = await supabase
      .from('operational_costs')
      .insert({
        outlet_id: input.outletId,
        category: input.category,
        amount: input.amount,
        date: input.date,
        notes: input.notes || null,
        created_by: input.createdBy || null,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to record cost: ${error.message}`)
    return data
  }

  /**
   * Get costs for a date range
   */
  async getCosts(
    outletId: string,
    startDate: string,
    endDate: string,
    category?: CostCategory,
  ): Promise<OperationalCostRecord[]> {
    let query = supabase
      .from('operational_costs')
      .select('*')
      .eq('outlet_id', outletId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch costs: ${error.message}`)
    return data || []
  }

  /**
   * Get total costs for a period, grouped by category
   */
  async getCostSummary(outletId: string, startDate: string, endDate: string): Promise<CostSummary[]> {
    const costs = await this.getCosts(outletId, startDate, endDate)
    const totals = new Map<CostCategory, number>()
    const counts = new Map<CostCategory, number>()

    for (const cost of costs) {
      const cat = cost.category as CostCategory
      totals.set(cat, (totals.get(cat) || 0) + Number(cost.amount))
      counts.set(cat, (counts.get(cat) || 0) + 1)
    }

    const totalAll = Array.from(totals.values()).reduce((s, v) => s + v, 0)

    return ALL_CATEGORIES
      .filter((cat) => totals.has(cat))
      .map((cat) => ({
        category: cat,
        total: totals.get(cat) || 0,
        percentage: totalAll > 0 ? ((totals.get(cat) || 0) / totalAll) * 100 : 0,
        count: counts.get(cat) || 0,
      }))
      .sort((a, b) => b.total - a.total)
  }

  /**
   * Get monthly cost report
   */
  async getMonthlyReport(outletId: string, year: number, month: number): Promise<MonthlyCostReport> {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const startDate = `${monthStr}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const costs = await this.getCosts(outletId, startDate, endDate)
    const total = costs.reduce((s, c) => s + Number(c.amount), 0)
    const daysInMonth = new Date(year, month, 0).getDate()

    const categoryTotals = new Map<string, number>()
    const categoryCounts = new Map<string, number>()

    for (const cost of costs) {
      const cat = cost.category
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Number(cost.amount))
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1)
    }

    const categories: CostSummary[] = Array.from(categoryTotals.entries())
      .map(([category, totalAmt]) => ({
        category: category as CostCategory,
        total: totalAmt,
        percentage: total > 0 ? (totalAmt / total) * 100 : 0,
        count: categoryCounts.get(category) || 0,
      }))
      .sort((a, b) => b.total - a.total)

    return {
      month: monthStr,
      totalCost: total,
      categories,
      dailyAverage: total / daysInMonth,
    }
  }

  /**
   * Get cost trends over months
   */
  async getTrends(outletId: string, months: number): Promise<CostTrend[]> {
    const trends: CostTrend[] = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const report = await this.getMonthlyReport(outletId, d.getFullYear(), d.getMonth() + 1)

      const categories: Record<string, number> = {}
      for (const cat of report.categories) {
        categories[cat.category] = cat.total
      }

      trends.push({
        month: report.month,
        total: report.totalCost,
        categories,
      })
    }

    return trends
  }

  /**
   * Delete a cost record
   */
  async deleteCost(costId: string, outletId: string): Promise<void> {
    const { error } = await supabase
      .from('operational_costs')
      .delete()
      .eq('id', costId)
      .eq('outlet_id', outletId)

    if (error) throw new Error(`Failed to delete cost: ${error.message}`)
  }

  /**
   * Get total operational costs for profit calculation
   */
  async getTotalForProfitCalculation(
    outletId: string,
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const costs = await this.getCosts(outletId, startDate, endDate)
    return costs.reduce((sum, c) => sum + Number(c.amount), 0)
  }

  /**
   * Get category label
   */
  getCategoryLabel(category: CostCategory): string {
    return CATEGORY_LABELS[category] || category
  }

  /**
   * Get all categories
   */
  getAllCategories(): CostCategory[] {
    return [...ALL_CATEGORIES]
  }
}

export const operationalCostEngine = new OperationalCostEngine()