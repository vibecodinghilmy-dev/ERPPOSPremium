// ============================================================================
// HPP Engine — Type Definitions
// ============================================================================

// ─── Calculation Inputs ─────────────────────────────────────────────

export interface HPPCalculationInput {
  outletId: string
  productId: string
  recipeVersion?: number
  ingredientCosts?: Record<string, number> // ingredient_id → unit_cost override
  packagingCosts?: Record<string, number> // packaging_item_id → unit_cost override
  overheadRate?: number // percentage override
  laborRate?: number // percentage override
}

export interface BatchHPPInput {
  outletId: string
  productIds: string[]
  forceRecalculate?: boolean
}

// ─── Cost Breakdown ─────────────────────────────────────────────────

export interface IngredientCostDetail {
  ingredientId: string
  ingredientName: string
  quantity: number
  unitSymbol: string
  unitCost: number
  totalCost: number
  costSource: 'purchase_price' | 'average_cost' | 'manual_override'
}

export interface SemiFinishedCostDetail {
  semiFinishedId: string
  semiFinishedName: string
  quantity: number
  unitSymbol: string
  unitCost: number
  totalCost: number
  yieldLossAdjustedCost: number
  subComponents: IngredientCostDetail[]
  subSemiFinished: SemiFinishedCostDetail[]
}

export interface PackagingCostDetail {
  packagingItemId: string
  packagingName: string
  quantityPerProduct: number
  unitCost: number
  totalCost: number
  costSource: 'purchase_price' | 'average_cost' | 'manual_override'
}

export interface OverheadCostDetail {
  laborOverhead: number
  laborRatePercent: number
  operationalOverhead: number
  operationalRatePercent: number
  totalOverhead: number
}

// ─── Calculation Result ─────────────────────────────────────────────

export interface HPPCalculationResult {
  productId: string
  productName: string
  recipeId: string | null
  recipeVersion: number | null
  outletId: string
  calculatedAt: string

  // Raw materials
  ingredientCosts: IngredientCostDetail[]
  totalIngredientCost: number

  // Semi-finished products (recursive)
  semiFinishedCosts: SemiFinishedCostDetail[]
  totalSemiFinishedCost: number

  // Packaging
  packagingCosts: PackagingCostDetail[]
  totalPackagingCost: number

  // Overhead
  overhead: OverheadCostDetail
  totalOverheadCost: number

  // Totals
  totalHPP: number
  hppPerUnit: number
  yieldFactor: number

  // Margins (requires selling price)
  sellingPrice: number | null
  foodCostPercent: number | null
  grossMargin: number | null
  grossMarginPercent: number | null
  profitMarginPercent: number | null

  // Metadata
  warnings: HPPWarning[]
  calculationDurationMs: number
}

export interface HPPWarning {
  type: 'missing_ingredient_cost' | 'missing_packaging_cost' | 'no_active_recipe'
    | 'conversion_not_found' | 'zero_quantity' | 'price_mismatch' | 'yield_loss_high'
    | 'semi_finished_no_recipe' | 'ingredient_out_of_stock'
  message: string
  severity: 'info' | 'warning' | 'error'
  entityId?: string
  entityName?: string
}

// ─── Snapshot ───────────────────────────────────────────────────────

export interface HPPProductSnapshot {
  productId: string
  productName: string
  recipeVersion: number | null
  ingredientHPP: number
  packagingHPP: number
  laborOverheadHPP: number
  totalHPP: number
  sellingPrice: number | null
  foodCostPercent: number | null
  grossMarginPercent: number | null
  calculatedAt: string
}

export interface HPPChangeLog {
  id: string
  productId: string
  previousHPP: number
  newHPP: number
  changePercent: number
  reason: string
  triggeredBy: string
  triggeredById: string | null
  calculatedAt: string
}

// ─── Overhead Configuration ─────────────────────────────────────────

export interface OverheadConfig {
  outletId: string
  laborOverheadRate: number // percentage of ingredient + packaging HPP
  operationalOverheadRate: number // percentage of ingredient + packaging HPP
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
}

// ─── Unit Conversion ────────────────────────────────────────────────

export interface UnitConversionResult {
  fromUnitId: string
  toUnitId: string
  fromUnitSymbol: string
  toUnitSymbol: string
  conversionFactor: number
  isExact: boolean
  inputQuantity: number
  outputQuantity: number
}

// ─── Recipe Resolution ──────────────────────────────────────────────

export interface ResolvedRecipeItem {
  ingredientId: string
  ingredientName: string
  quantityInBaseUnit: number
  unitId: string
  unitSymbol: string
  unitCost: number
  totalCost: number
}

export interface ResolvedSemiFinishedItem {
  semiFinishedId: string
  semiFinishedName: string
  quantityInBaseUnit: number
  unitId: string
  unitSymbol: string
  unitCost: number
  totalCost: number
  yieldLossFactor: number
  subIngredients: ResolvedRecipeItem[]
  subSemiFinished: ResolvedSemiFinishedItem[]
}

// ─── Constants ──────────────────────────────────────────────────────

export const DEFAULT_OVERHEAD_RATES = {
  laborOverheadPercent: 15, // 15% of ingredient + packaging cost
  operationalOverheadPercent: 10, // 10% of ingredient + packaging cost
}

export const FOOD_COST_TARGETS = {
  ideal: 28, // 28% — target for high-margin items
  good: 30, // 30% — standard target
  acceptable: 35, // 35% — maximum acceptable
  critical: 40, // 40% — above this is loss-making
}

export const YIELD_THRESHOLD = {
  warning: 70, // below 70% yield triggers warning
  critical: 50, // below 50% yield is critical
}

export const PROFIT_MARGIN_TARGETS = {
  excellent: 50, // 50%+ margin
  good: 40, // 40%+ margin
  acceptable: 30, // 30%+ margin
  minimum: 20, // 20% minimum viable
}