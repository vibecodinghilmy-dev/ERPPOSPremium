// ============================================================================
// HPP Engine — Service Layer
// Orchestrates calculations, manages snapshots, change logs, and automation
// ============================================================================

import { HPPCalculator } from './calculator'
import { RecipeRepository } from '../../repositories/hpp/recipeRepository'
import type {
  HPPCalculationInput,
  HPPCalculationResult,
  HPPProductSnapshot,
  HPPChangeLog,
  HPPWarning,
  OverheadConfig,
  BatchHPPInput,
} from './types'

// ─── Snapshot Store (in-memory, will be replaced by Supabase) ───────

interface SnapshotRecord {
  productId: string
  snapshot: HPPProductSnapshot
}

interface ChangeLogRecord {
  productId: string
  log: HPPChangeLog
}

let snapshots: SnapshotRecord[] = []
let changeLogs: ChangeLogRecord[] = []
let changeLogCounter = 0

// ─── Overhead Config Store ──────────────────────────────────────────

const defaultOverheadConfigs: OverheadConfig[] = [
  {
    outletId: 'outlet_1',
    laborOverheadRate: 15,
    operationalOverheadRate: 10,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    isActive: true,
  },
]

// ─── HPP Service ────────────────────────────────────────────────────

export class HPPService {
  private calculator: HPPCalculator
  private repo: RecipeRepository

  constructor(calculator?: HPPCalculator, repo?: RecipeRepository) {
    this.calculator = calculator || new HPPCalculator()
    this.repo = repo || new RecipeRepository()
  }

  // ─── Single Product Calculation ──────────────────────────────────

  async calculateProduct(input: HPPCalculationInput): Promise<HPPCalculationResult> {
    const result = await this.calculator.calculate(input)

    // Auto-snapshot on successful calculation
    if (result.recipeId && result.totalHPP > 0) {
      this.createSnapshot(result)
    }

    return result
  }

  // ─── Batch Calculation ──────────────────────────────────────────

  async calculateBatch(input: BatchHPPInput): Promise<{
    results: Map<string, HPPCalculationResult>
    summary: BatchSummary
  }> {
    const results = await this.calculator.calculateBatch(
      input.outletId,
      input.productIds,
      input.forceRecalculate,
    )

    let totalHPP = 0
    let totalRevenue = 0
    let productsWithWarnings = 0
    let productsWithErrors = 0

    results.forEach((result) => {
      totalHPP += result.totalHPP
      if (result.sellingPrice) totalRevenue += result.sellingPrice
      if (result.warnings.some((w) => w.severity === 'warning')) productsWithWarnings++
      if (result.warnings.some((w) => w.severity === 'error')) productsWithErrors++

      // Auto-snapshot
      if (result.recipeId && result.totalHPP > 0) {
        this.createSnapshot(result)
      }
    })

    return {
      results,
      summary: {
        totalProducts: input.productIds.length,
        calculatedProducts: results.size,
        totalHPP,
        totalRevenue,
        averageFoodCostPercent: totalRevenue > 0
          ? Math.round((totalHPP / totalRevenue) * 10000) / 100
          : 0,
        productsWithWarnings,
        productsWithErrors,
        calculatedAt: new Date().toISOString(),
      },
    }
  }

  // ─── What-If Analysis ──────────────────────────────────────────

  async analyzeScenario(
    input: HPPCalculationInput,
    ingredientPriceChanges: Record<string, number>,
  ) {
    return this.calculator.whatIfAnalysis(input, ingredientPriceChanges)
  }

  // ─── Snapshot Management ────────────────────────────────────────

  private createSnapshot(result: HPPCalculationResult): void {
    const snapshot: HPPProductSnapshot = {
      productId: result.productId,
      productName: result.productName,
      recipeVersion: result.recipeVersion,
      ingredientHPP: result.totalIngredientCost,
      packagingHPP: result.totalPackagingCost,
      laborOverheadHPP: result.overhead.laborOverhead,
      totalHPP: result.totalHPP,
      sellingPrice: result.sellingPrice,
      foodCostPercent: result.foodCostPercent,
      grossMarginPercent: result.grossMarginPercent,
      calculatedAt: result.calculatedAt,
    }

    // Check for changes and log them
    const existing = snapshots.find((s) => s.productId === result.productId)
    if (existing) {
      const prevHPP = existing.snapshot.totalHPP
      if (prevHPP !== result.totalHPP) {
        const changePercent = prevHPP > 0
          ? Math.round(((result.totalHPP - prevHPP) / prevHPP) * 10000) / 100
          : 0

        const changeLog: HPPChangeLog = {
          id: `chg_${++changeLogCounter}`,
          productId: result.productId,
          previousHPP: prevHPP,
          newHPP: result.totalHPP,
          changePercent,
          reason: changePercent > 0
            ? `HPP increased by ${changePercent}%`
            : `HPP decreased by ${Math.abs(changePercent)}%`,
          triggeredBy: 'auto_recalculation',
          triggeredById: null,
          calculatedAt: new Date().toISOString(),
        }

        changeLogs.push({ productId: result.productId, log: changeLog })
      }
    }

    // Upsert snapshot
    const idx = snapshots.findIndex((s) => s.productId === result.productId)
    if (idx >= 0) {
      snapshots[idx] = { productId: result.productId, snapshot }
    } else {
      snapshots.push({ productId: result.productId, snapshot })
    }
  }

  getSnapshots(productId?: string): HPPProductSnapshot[] {
    if (productId) {
      const s = snapshots.find((s) => s.productId === productId)
      return s ? [s.snapshot] : []
    }
    return snapshots.map((s) => s.snapshot)
  }

  getChangeLogs(productId?: string): HPPChangeLog[] {
    if (productId) {
      return changeLogs
        .filter((cl) => cl.productId === productId)
        .map((cl) => cl.log)
    }
    return changeLogs.map((cl) => cl.log)
  }

  // ─── Overhead Configuration ─────────────────────────────────────

  getOverheadConfig(outletId: string): OverheadConfig | null {
    return defaultOverheadConfigs.find(
      (cfg) => cfg.outletId === outletId && cfg.isActive,
    ) || null
  }

  // ─── Recalculate All Products ───────────────────────────────────

  async recalculateAll(outletId: string): Promise<{
    results: Map<string, HPPCalculationResult>
    totalProducts: number
    errors: number
  }> {
    // Get all product IDs from the repository
    const products = await Promise.all(
      ['p1', 'p2', 'p3'].map((id) => this.repo.getProduct(id)),
    )
    const productIds = products
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => p.id)

    const result = await this.calculateBatch({
      outletId,
      productIds,
      forceRecalculate: true,
    })

    return {
      results: result.results,
      totalProducts: productIds.length,
      errors: result.summary.productsWithErrors,
    }
  }

  // ─── Auto-Recalculation Trigger ─────────────────────────────────

  async onIngredientPriceChanged(
    ingredientId: string,
    oldPrice: number,
    newPrice: number,
  ): Promise<{
    affectedProducts: string[]
    recalculatedResults: Map<string, HPPCalculationResult>
  }> {
    // Find which products use this ingredient
    const affectedProducts = this.findProductsUsingIngredient(ingredientId)

    if (affectedProducts.length === 0) {
      return { affectedProducts: [], recalculatedResults: new Map() }
    }

    const results = await this.calculator.calculateBatch(
      'outlet_1',
      affectedProducts,
      true,
    )

    // Snapshot all results
    results.forEach((result) => this.createSnapshot(result))

    return {
      affectedProducts,
      recalculatedResults: results,
    }
  }

  async onPackagingPriceChanged(
    packagingItemId: string,
    oldPrice: number,
    newPrice: number,
  ): Promise<{
    affectedProducts: string[]
    recalculatedResults: Map<string, HPPCalculationResult>
  }> {
    // Find which products use this packaging item
    const results = await this.calculator.calculateBatch(
      'outlet_1',
      ['p1', 'p2', 'p3'],
      true,
    )

    const affectedProducts = Array.from(results.keys())

    results.forEach((result) => this.createSnapshot(result))

    return {
      affectedProducts,
      recalculatedResults: results,
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private findProductsUsingIngredient(ingredientId: string): string[] {
    // In production, this would query the recipe_items table
    // For now, use the mock data to find affected products
    const recipeMap: Record<string, string[]> = {
      i1: ['p1', 'p3'], // Premium Milk Base → Beng-Beng Ice + Iced Caramel Macchiato
      i2: ['p1'],       // Beng-Beng Wafer → Beng-Beng Ice
      i4: ['p3'],       // Espresso Shot → Iced Caramel Macchiato
      i9: ['p2'],       // Beef Patty → Premium Cheeseburger
      i10: ['p2'],
      i8: ['p2'],
    }

    return recipeMap[ingredientId] || []
  }
}

// ─── Summary Interface ──────────────────────────────────────────────

export interface BatchSummary {
  totalProducts: number
  calculatedProducts: number
  totalHPP: number
  totalRevenue: number
  averageFoodCostPercent: number
  productsWithWarnings: number
  productsWithErrors: number
  calculatedAt: string
}

// ─── Singleton Export ───────────────────────────────────────────────

export const hppService = new HPPService()