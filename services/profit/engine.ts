// ============================================================================
// Profit Engine — Calculates Revenue, COGS, Gross Profit, Net Profit
// Per: Product, Category, Outlet, Day, Month, Year
// ============================================================================

import { supabase } from '../../src/lib/supabase'
import type {
  OutletProfitSummary,
  ProductProfit,
  CategoryProfit,
  DailyProfit,
  MonthlyProfit,
  YearlyProfit,
  ProfitSnapshot,
  ProfitCalculationInput,
} from './types'

export class ProfitEngine {
  /**
   * Calculate full profit summary for an outlet
   */
  async calculateOutletProfit(outletId: string, input: ProfitCalculationInput): Promise<OutletProfitSummary> {
    const { data: outlet } = await supabase
      .from('outlets')
      .select('name')
      .eq('id', outletId)
      .single()

    // Get sales for the period
    const { data: sales } = await supabase
      .from('sales')
      .select(`
        id, sale_number, subtotal, tax_amount, discount_amount,
        total_amount, created_at,
        sale_items (
          product_id, quantity, unit_price, total_price, hpp_at_sale,
          products (id, name, product_categories (name))
        )
      `)
      .eq('outlet_id', outletId)
      .gte('created_at', input.startDate)
      .lte('created_at', input.endDate)
      .in('status', ['completed', 'processing'])
      .order('created_at', { ascending: true })

    if (!sales) {
      return this.emptySummary(outletId, outlet?.name || 'Unknown Outlet')
    }

    // Aggregate per product
    const productMap = new Map<string, ProductProfit>()
    // Aggregate per category
    const categoryMap = new Map<string, CategoryProfit>()
    // Aggregate per day
    const dayMap = new Map<string, DailyProfit>()

    for (const sale of sales) {
      const date = sale.created_at.split('T')[0]
      const dayKey = date

      // Initialize daily profit
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, {
          date,
          revenue: 0,
          hpp: 0,
          grossProfit: 0,
          operationalCosts: 0,
          netProfit: 0,
          netMargin: 0,
        })
      }

      const day = dayMap.get(dayKey)!

      for (const item of (sale as any).sale_items || []) {
        const product = item.products || {}
        const categoryName = product.product_categories?.name || 'Uncategorized'
        const productId = product.id || item.product_id
        const productName = product.name || 'Unknown Product'
        const revenue = item.total_price || 0
        const hpp = (item.hpp_at_sale || 0) * item.quantity
        const profit = revenue - hpp

        // Product aggregation
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            productId,
            productName,
            category: categoryName,
            quantitySold: 0,
            revenue: 0,
            hpp: 0,
            grossProfit: 0,
            grossMargin: 0,
            foodCostPercent: 0,
          })
        }
        const p = productMap.get(productId)!
        p.quantitySold += item.quantity || 0
        p.revenue += revenue
        p.hpp += hpp
        p.grossProfit += profit

        // Category aggregation
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, {
            category: categoryName,
            revenue: 0,
            hpp: 0,
            grossProfit: 0,
            grossMargin: 0,
            productCount: 0,
          })
        }
        const c = categoryMap.get(categoryName)!
        c.revenue += revenue
        c.hpp += hpp
        c.grossProfit += profit
        c.productCount = new Set([
          ...Array.from(productMap.values())
            .filter((x) => x.category === categoryName)
            .map((x) => x.productId),
        ]).size

        // Daily aggregation
        day.revenue += revenue
        day.hpp += hpp
        day.grossProfit += profit
      }
    }

    // Get operational costs for the period
    const { data: opCosts } = await supabase
      .from('operational_costs')
      .select('amount, date, category')
      .eq('outlet_id', outletId)
      .gte('date', input.startDate.split('T')[0])
      .lte('date', input.endDate.split('T')[0])

    // Allocate operational costs to days
    const dailyOpCosts = new Map<string, number>()
    if (opCosts) {
      for (const cost of opCosts) {
        const dateKey = cost.date
        dailyOpCosts.set(dateKey, (dailyOpCosts.get(dateKey) || 0) + Number(cost.amount))
      }
    }

    // Apply operational costs to daily profits
    let totalRevenue = 0
    let totalHPP = 0
    let totalGrossProfit = 0
    let totalOperationalCosts = 0
    let totalNetProfit = 0

    for (const [dayKey, day] of dayMap) {
      const opCost = dailyOpCosts.get(dayKey) || 0
      day.operationalCosts = opCost
      day.netProfit = day.grossProfit - opCost
      day.netMargin = day.revenue > 0 ? (day.netProfit / day.revenue) * 100 : 0

      totalRevenue += day.revenue
      totalHPP += day.hpp
      totalGrossProfit += day.grossProfit
      totalOperationalCosts += opCost
      totalNetProfit += day.netProfit
    }

    // Calculate margins for products
    for (const p of productMap.values()) {
      p.grossMargin = p.revenue > 0 ? (p.grossProfit / p.revenue) * 100 : 0
      p.foodCostPercent = p.revenue > 0 ? (p.hpp / p.revenue) * 100 : 0
    }

    // Calculate margins for categories
    for (const c of categoryMap.values()) {
      c.grossMargin = c.revenue > 0 ? (c.grossProfit / c.revenue) * 100 : 0
    }

    const grossMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0
    const netMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0
    const foodCostPercent = totalRevenue > 0 ? (totalHPP / totalRevenue) * 100 : 0

    return {
      outletId,
      outletName: outlet?.name || 'Unknown Outlet',
      totalRevenue,
      totalHPP,
      totalGrossProfit,
      totalOperationalCosts,
      totalNetProfit,
      grossMargin,
      netMargin,
      foodCostPercent,
      productProfits: Array.from(productMap.values()),
      categoryProfits: Array.from(categoryMap.values()),
      dailyProfits: Array.from(dayMap.values()),
    }
  }

  /**
   * Create a profit snapshot for a sale transaction
   */
  async createSaleSnapshot(
    outletId: string,
    saleId: string,
    saleNumber: string,
    revenue: number,
    hpp: number,
    productBreakdown: ProfitSnapshot['productBreakdown'],
  ): Promise<ProfitSnapshot> {
    const grossProfit = revenue - hpp

    // Get operational costs for today
    const today = new Date().toISOString().split('T')[0]
    const { data: todaysCosts } = await supabase
      .from('operational_costs')
      .select('amount')
      .eq('outlet_id', outletId)
      .eq('date', today)

    const dailyOpCost = todaysCosts
      ? todaysCosts.reduce((sum, c) => sum + Number(c.amount), 0)
      : 0

    // Allocate proportionally based on this sale's share of daily revenue
    const { data: dailySales } = await supabase
      .from('sales')
      .select('total_amount')
      .eq('outlet_id', outletId)
      .gte('created_at', `${today}T00:00:00Z`)
      .lte('created_at', `${today}T23:59:59Z`)

    const dailyTotalRevenue = dailySales
      ? dailySales.reduce((sum, s) => sum + Number(s.total_amount), 0)
      : revenue

    const allocatedOpCost = dailyTotalRevenue > 0
      ? (revenue / dailyTotalRevenue) * dailyOpCost
      : 0

    const netProfit = grossProfit - allocatedOpCost

    const snapshot: ProfitSnapshot = {
      id: crypto.randomUUID(),
      outletId,
      saleId,
      saleNumber,
      revenue,
      hpp,
      grossProfit,
      operationalCosts: allocatedOpCost,
      netProfit,
      productBreakdown,
      calculatedAt: new Date().toISOString(),
    }

    return snapshot
  }

  /**
   * Calculate monthly profit for a period
   */
  async calculateMonthlyProfits(outletId: string, year: number): Promise<MonthlyProfit[]> {
    const months: MonthlyProfit[] = []

    for (let month = 1; month <= 12; month++) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]

      const summary = await this.calculateOutletProfit(outletId, {
        outletId,
        startDate,
        endDate: `${endDate}T23:59:59Z`,
      })

      months.push({
        month: `${year}-${String(month).padStart(2, '0')}`,
        revenue: summary.totalRevenue,
        hpp: summary.totalHPP,
        grossProfit: summary.totalGrossProfit,
        operationalCosts: summary.totalOperationalCosts,
        netProfit: summary.totalNetProfit,
        netMargin: summary.netMargin,
        foodCostPercent: summary.foodCostPercent,
        transactionCount: summary.dailyProfits.length,
      })
    }

    return months
  }

  /**
   * Calculate yearly profit
   */
  async calculateYearlyProfit(outletId: string, year: number): Promise<YearlyProfit> {
    const months = await this.calculateMonthlyProfits(outletId, year)

    const totalRevenue = months.reduce((s, m) => s + m.revenue, 0)
    const totalHPP = months.reduce((s, m) => s + m.hpp, 0)
    const totalGrossProfit = months.reduce((s, m) => s + m.grossProfit, 0)
    const totalOperationalCosts = months.reduce((s, m) => s + m.operationalCosts, 0)
    const totalNetProfit = months.reduce((s, m) => s + m.netProfit, 0)

    return {
      year,
      revenue: totalRevenue,
      hpp: totalHPP,
      grossProfit: totalGrossProfit,
      operationalCosts: totalOperationalCosts,
      netProfit: totalNetProfit,
      netMargin: totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0,
      months,
    }
  }

  private emptySummary(outletId: string, outletName: string): OutletProfitSummary {
    return {
      outletId,
      outletName,
      totalRevenue: 0,
      totalHPP: 0,
      totalGrossProfit: 0,
      totalOperationalCosts: 0,
      totalNetProfit: 0,
      grossMargin: 0,
      netMargin: 0,
      foodCostPercent: 0,
      productProfits: [],
      categoryProfits: [],
      dailyProfits: [],
    }
  }
}

export const profitEngine = new ProfitEngine()