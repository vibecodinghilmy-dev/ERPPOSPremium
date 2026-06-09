// ============================================================================
// HPP Engine — Core Calculator
// Performs all HPP calculations: raw materials, semi-finished, packaging, overhead
// ============================================================================

import { RecipeRepository } from '../../repositories/hpp/recipeRepository'
import type {
  HPPCalculationInput,
  HPPCalculationResult,
  IngredientCostDetail,
  SemiFinishedCostDetail,
  PackagingCostDetail,
  OverheadCostDetail,
  HPPWarning,
  UnitConversionResult,
} from './types'
import {
  DEFAULT_OVERHEAD_RATES,
  FOOD_COST_TARGETS,
  YIELD_THRESHOLD,
} from './types'

export class HPPCalculator {
  private repo: RecipeRepository

  constructor(repo?: RecipeRepository) {
    this.repo = repo || new RecipeRepository()
  }

  // ─── Main Entry Point ──────────────────────────────────────────────

  async calculate(input: HPPCalculationInput): Promise<HPPCalculationResult> {
    const startTime = performance.now()
    const warnings: HPPWarning[] = []

    const product = await this.repo.getProduct(input.productId)
    if (!product) {
      return this.buildErrorResult(input, [{
        type: 'no_active_recipe',
        message: `Product ${input.productId} not found`,
        severity: 'error',
      }])
    }

    // 1. Get the active recipe or specified version
    const recipe = await this.repo.getActiveRecipe(input.productId)
    if (!recipe) {
      warnings.push({
        type: 'no_active_recipe',
        message: `No active recipe found for ${product.name}`,
        severity: 'error',
        entityId: input.productId,
        entityName: product.name,
      })
      return this.buildErrorResult(input, warnings, product)
    }

    // 2. Resolve ingredient costs from recipe items
    const recipeItems = await this.repo.getRecipeItems(recipe.id)
    const ingredientCosts: IngredientCostDetail[] = []
    const semiFinishedCosts: SemiFinishedCostDetail[] = []

    for (const item of recipeItems) {
      // Check if this ingredient is actually a semi-finished product
      const semiFinished = await this.repo.getSemiFinished(item.ingredient_id)
      if (semiFinished) {
        const sfCost = await this.calculateSemiFinished(
          semiFinished,
          input,
          warnings,
        )
        if (sfCost) semiFinishedCosts.push(sfCost)
        continue
      }

      const cost = await this.calculateIngredientCost(item, input, warnings)
      if (cost) ingredientCosts.push(cost)
    }

    // 3. Calculate packaging costs
    const packagingCosts = await this.calculatePackaging(input, warnings)

    // 4. Calculate overhead
    const totalDirectCost = this.sumCosts(ingredientCosts) +
      this.sumSemiFinishedCosts(semiFinishedCosts) +
      this.sumPackagingCosts(packagingCosts)

    const overhead = this.calculateOverhead(totalDirectCost, input)

    // 5. Compute totals
    const totalHPP = totalDirectCost + overhead.totalOverhead
    const yieldFactor = this.calculateYieldFactor(semiFinishedCosts)

    // 6. Margins
    const sellingPrice = product.selling_price
    const foodCostPercent = sellingPrice > 0 ? (totalHPP / sellingPrice) * 100 : null
    const grossMargin = sellingPrice ? sellingPrice - totalHPP : null
    const grossMarginPercent = sellingPrice && sellingPrice > 0
      ? ((sellingPrice - totalHPP) / sellingPrice) * 100
      : null

    // 7. Build food cost warnings
    this.checkFoodCostTargets(foodCostPercent, warnings, product.name)
    this.checkYieldWarnings(semiFinishedCosts, warnings)

    const endTime = performance.now()

    return {
      productId: product.id,
      productName: product.name,
      recipeId: recipe.id,
      recipeVersion: recipe.version,
      outletId: input.outletId,
      calculatedAt: new Date().toISOString(),

      ingredientCosts,
      totalIngredientCost: this.sumCosts(ingredientCosts),

      semiFinishedCosts,
      totalSemiFinishedCost: this.sumSemiFinishedCosts(semiFinishedCosts),

      packagingCosts,
      totalPackagingCost: this.sumPackagingCosts(packagingCosts),

      overhead,
      totalOverheadCost: overhead.totalOverhead,

      totalHPP: Math.round(totalHPP),
      hppPerUnit: Math.round(totalHPP),
      yieldFactor,

      sellingPrice,
      foodCostPercent: foodCostPercent !== null ? Math.round(foodCostPercent * 100) / 100 : null,
      grossMargin: grossMargin !== null ? Math.round(grossMargin) : null,
      grossMarginPercent: grossMarginPercent !== null ? Math.round(grossMarginPercent * 100) / 100 : null,
      profitMarginPercent: grossMarginPercent !== null
        ? Math.round(grossMarginPercent * 100) / 100
        : null,

      warnings,
      calculationDurationMs: Math.round(endTime - startTime),
    }
  }

  // ─── Ingredient Cost Calculation ───────────────────────────────────

  private async calculateIngredientCost(
    item: { ingredient_id: string; quantity: number; unit_id: string; unit_cost: number },
    input: HPPCalculationInput,
    warnings: HPPWarning[],
  ): Promise<IngredientCostDetail | null> {
    const ingredient = await this.repo.getIngredient(item.ingredient_id)
    if (!ingredient) {
      warnings.push({
        type: 'missing_ingredient_cost',
        message: `Ingredient ${item.ingredient_id} not found in database`,
        severity: 'error',
        entityId: item.ingredient_id,
      })
      return null
    }

    // Use override cost if provided, otherwise use recipe's stored unit_cost or purchase_price
    let unitCost: number
    let costSource: IngredientCostDetail['costSource']

    if (input.ingredientCosts && input.ingredientCosts[item.ingredient_id] !== undefined) {
      unitCost = input.ingredientCosts[item.ingredient_id]
      costSource = 'manual_override'
    } else if (item.unit_cost > 0) {
      unitCost = item.unit_cost
      costSource = 'average_cost'
    } else {
      unitCost = ingredient.purchase_price
      costSource = 'purchase_price'
    }

    // Convert units if needed
    let effectiveQuantity = item.quantity
    let unitSymbol = ''

    const unit = await this.repo.getUnit(item.unit_id)
    if (unit) {
      unitSymbol = unit.symbol
    }

    // Handle unit conversion: if recipe uses a different unit than ingredient default
    if (item.unit_id !== ingredient.unit_id) {
      const conversion = await this.repo.getUnitConversion(
        input.outletId,
        item.unit_id,
        ingredient.unit_id,
      )

      if (conversion) {
        effectiveQuantity = item.quantity * conversion.conversion_factor
      } else {
        warnings.push({
          type: 'conversion_not_found',
          message: `No unit conversion from ${item.unit_id} to ${ingredient.unit_id} for ${ingredient.name}`,
          severity: 'warning',
          entityId: item.ingredient_id,
          entityName: ingredient.name,
        })
      }
    }

    // Check stock
    if (ingredient.current_stock <= 0) {
      warnings.push({
        type: 'ingredient_out_of_stock',
        message: `${ingredient.name} is out of stock`,
        severity: 'warning',
        entityId: item.ingredient_id,
        entityName: ingredient.name,
      })
    }

    // Validate cost
    if (unitCost <= 0) {
      warnings.push({
        type: 'missing_ingredient_cost',
        message: `${ingredient.name} has zero cost — check purchase price`,
        severity: 'warning',
        entityId: item.ingredient_id,
        entityName: ingredient.name,
      })
    }

    const totalCost = Math.round(effectiveQuantity * unitCost)

    return {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      quantity: Math.round(effectiveQuantity * 100) / 100,
      unitSymbol,
      unitCost,
      totalCost,
      costSource,
    }
  }

  // ─── Semi-Finished Product Calculation ────────────────────────────

  private async calculateSemiFinished(
    semiFinished: { id: string; name: string; standard_yield: number },
    input: HPPCalculationInput,
    warnings: HPPWarning[],
    depth = 0,
  ): Promise<SemiFinishedCostDetail | null> {
    if (depth > 5) {
      warnings.push({
        type: 'semi_finished_no_recipe',
        message: `Maximum recursion depth reached for ${semiFinished.name}`,
        severity: 'error',
        entityId: semiFinished.id,
        entityName: semiFinished.name,
      })
      return null
    }

    const sfItems = await this.repo.getSemiFinishedRecipeItems(semiFinished.id)
    if (sfItems.length === 0) {
      warnings.push({
        type: 'semi_finished_no_recipe',
        message: `${semiFinished.name} has no recipe items defined`,
        severity: 'error',
        entityId: semiFinished.id,
        entityName: semiFinished.name,
      })
      return null
    }

    const subIngredients: IngredientCostDetail[] = []
    const subSemiFinished: SemiFinishedCostDetail[] = []
    let totalCost = 0

    for (const sfItem of sfItems) {
      if (sfItem.ingredient_id) {
        const cost = await this.calculateIngredientCost(
          {
            ingredient_id: sfItem.ingredient_id,
            quantity: sfItem.quantity,
            unit_id: sfItem.unit_id,
            unit_cost: sfItem.unit_cost,
          },
          input,
          warnings,
        )
        if (cost) {
          subIngredients.push(cost)
          totalCost += cost.totalCost
        }
      } else if (sfItem.sub_semi_finished_id) {
        const subSF = await this.repo.getSemiFinished(sfItem.sub_semi_finished_id)
        if (subSF) {
          const cost = await this.calculateSemiFinished(subSF, input, warnings, depth + 1)
          if (cost) {
            subSemiFinished.push(cost)
            totalCost += cost.totalCost
          }
        }
      }
    }

    // Apply yield loss
    const yieldFactor = semiFinished.standard_yield / 100
    const yieldLossAdjustedCost = yieldFactor > 0
      ? Math.round(totalCost / yieldFactor)
      : totalCost

    const unit = await this.repo.getUnit(sfItems[0]?.unit_id)

    return {
      semiFinishedId: semiFinished.id,
      semiFinishedName: semiFinished.name,
      quantity: 1,
      unitSymbol: unit?.symbol || '',
      unitCost: Math.round(totalCost),
      totalCost,
      yieldLossAdjustedCost,
      subComponents: subIngredients,
      subSemiFinished: subSemiFinished,
    }
  }

  // ─── Packaging Cost Calculation ─────────────────────────────────────

  private async calculatePackaging(
    input: HPPCalculationInput,
    warnings: HPPWarning[],
  ): Promise<PackagingCostDetail[]> {
    const packagingCosts = await this.repo.getActivePackagingCosts(input.productId)
    const results: PackagingCostDetail[] = []

    for (const pc of packagingCosts) {
      const packagingItem = await this.repo.getPackagingItem(pc.packaging_item_id)
      if (!packagingItem) {
        warnings.push({
          type: 'missing_packaging_cost',
          message: `Packaging item ${pc.packaging_item_id} not found`,
          severity: 'error',
          entityId: pc.packaging_item_id,
        })
        continue
      }

      let unitCost = pc.unit_cost_at_calculation
      let costSource: PackagingCostDetail['costSource'] = 'average_cost'

      // Override from input if provided
      if (input.packagingCosts && input.packagingCosts[pc.packaging_item_id] !== undefined) {
        unitCost = input.packagingCosts[pc.packaging_item_id]
        costSource = 'manual_override'
      } else if (packagingItem.purchase_price > 0) {
        unitCost = packagingItem.purchase_price
        costSource = 'purchase_price'
      }

      results.push({
        packagingItemId: packagingItem.id,
        packagingName: packagingItem.name,
        quantityPerProduct: pc.quantity_per_product,
        unitCost,
        totalCost: Math.round(pc.quantity_per_product * unitCost),
        costSource,
      })
    }

    return results
  }

  // ─── Overhead Calculation ───────────────────────────────────────────

  private calculateOverhead(
    directCost: number,
    input: HPPCalculationInput,
  ): OverheadCostDetail {
    const laborRate = input.laborRate ?? DEFAULT_OVERHEAD_RATES.laborOverheadPercent
    const operationalRate = input.overheadRate ?? DEFAULT_OVERHEAD_RATES.operationalOverheadPercent

    return {
      laborOverhead: Math.round(directCost * (laborRate / 100)),
      laborRatePercent: laborRate,
      operationalOverhead: Math.round(directCost * (operationalRate / 100)),
      operationalRatePercent: operationalRate,
      totalOverhead: Math.round(directCost * ((laborRate + operationalRate) / 100)),
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private sumCosts(costs: IngredientCostDetail[]): number {
    return costs.reduce((sum, c) => sum + c.totalCost, 0)
  }

  private sumSemiFinishedCosts(costs: SemiFinishedCostDetail[]): number {
    return costs.reduce((sum, c) => sum + c.yieldLossAdjustedCost, 0)
  }

  private sumPackagingCosts(costs: PackagingCostDetail[]): number {
    return costs.reduce((sum, c) => sum + c.totalCost, 0)
  }

  private calculateYieldFactor(semiFinishedCosts: SemiFinishedCostDetail[]): number {
    if (semiFinishedCosts.length === 0) return 100
    // Yield factor is the weighted average of semi-finished yields
    const totalCost = semiFinishedCosts.reduce((s, c) => s + c.totalCost, 0)
    const weightedYield = semiFinishedCosts.reduce((s, c) => {
      const cost = c.totalCost
      const sfYield = c.yieldLossAdjustedCost > 0 ? c.totalCost / c.yieldLossAdjustedCost : 1
      return s + (cost / totalCost) * sfYield * 100
    }, 0)
    return Math.round(weightedYield * 100) / 100
  }

  private checkFoodCostTargets(
    foodCostPercent: number | null,
    warnings: HPPWarning[],
    productName: string,
  ) {
    if (foodCostPercent === null) return

    if (foodCostPercent >= FOOD_COST_TARGETS.critical) {
      warnings.push({
        type: 'price_mismatch',
        message: `${productName}: Food cost ${foodCostPercent.toFixed(1)}% exceeds critical threshold (${FOOD_COST_TARGETS.critical}%)`,
        severity: 'error',
        entityName: productName,
      })
    } else if (foodCostPercent >= FOOD_COST_TARGETS.acceptable) {
      warnings.push({
        type: 'price_mismatch',
        message: `${productName}: Food cost ${foodCostPercent.toFixed(1)}% exceeds acceptable threshold (${FOOD_COST_TARGETS.acceptable}%)`,
        severity: 'warning',
        entityName: productName,
      })
    }
  }

  private checkYieldWarnings(
    semiFinishedCosts: SemiFinishedCostDetail[],
    warnings: HPPWarning[],
  ) {
    for (const sf of semiFinishedCosts) {
      const yieldPercent = sf.totalCost / (sf.yieldLossAdjustedCost || 1) * 100
      if (yieldPercent < YIELD_THRESHOLD.critical) {
        warnings.push({
          type: 'yield_loss_high',
          message: `${sf.semiFinishedName}: Yield ${yieldPercent.toFixed(1)}% is critically low`,
          severity: 'error',
          entityId: sf.semiFinishedId,
          entityName: sf.semiFinishedName,
        })
      } else if (yieldPercent < YIELD_THRESHOLD.warning) {
        warnings.push({
          type: 'yield_loss_high',
          message: `${sf.semiFinishedName}: Yield ${yieldPercent.toFixed(1)}% is below target`,
          severity: 'warning',
          entityId: sf.semiFinishedId,
          entityName: sf.semiFinishedName,
        })
      }
    }
  }

  private buildErrorResult(
    input: HPPCalculationInput,
    warnings: HPPWarning[],
    product?: { id: string; name: string; selling_price: number },
  ): HPPCalculationResult {
    return {
      productId: input.productId,
      productName: product?.name || 'Unknown',
      recipeId: null,
      recipeVersion: null,
      outletId: input.outletId,
      calculatedAt: new Date().toISOString(),
      ingredientCosts: [],
      totalIngredientCost: 0,
      semiFinishedCosts: [],
      totalSemiFinishedCost: 0,
      packagingCosts: [],
      totalPackagingCost: 0,
      overhead: { laborOverhead: 0, laborRatePercent: 0, operationalOverhead: 0, operationalRatePercent: 0, totalOverhead: 0 },
      totalOverheadCost: 0,
      totalHPP: 0,
      hppPerUnit: 0,
      yieldFactor: 100,
      sellingPrice: product?.selling_price || null,
      foodCostPercent: null,
      grossMargin: null,
      grossMarginPercent: null,
      profitMarginPercent: null,
      warnings,
      calculationDurationMs: 0,
    }
  }

  // ─── Batch Calculation ─────────────────────────────────────────────

  async calculateBatch(
    outletId: string,
    productIds: string[],
    forceRecalculate = false,
  ): Promise<Map<string, HPPCalculationResult>> {
    const results = new Map<string, HPPCalculationResult>()

    for (const productId of productIds) {
      const result = await this.calculate({
        outletId,
        productId,
      })
      results.set(productId, result)
    }

    return results
  }

  // ─── What-If Analysis ──────────────────────────────────────────────

  async whatIfAnalysis(
    input: HPPCalculationInput,
    ingredientPriceChanges: Record<string, number>, // ingredientId → new price
  ): Promise<{
    baseline: HPPCalculationResult
    scenario: HPPCalculationResult
    hppDelta: number
    hppDeltaPercent: number
    marginDelta: number
  }> {
    const baseline = await this.calculate({ ...input, ingredientCosts: undefined })

    const scenario = await this.calculate({
      ...input,
      ingredientCosts: {
        ...input.ingredientCosts,
        ...ingredientPriceChanges,
      },
    })

    const hppDelta = scenario.totalHPP - baseline.totalHPP
    const hppDeltaPercent = baseline.totalHPP > 0
      ? (hppDelta / baseline.totalHPP) * 100
      : 0
    const marginDelta = (scenario.grossMarginPercent ?? 0) - (baseline.grossMarginPercent ?? 0)

    return {
      baseline,
      scenario,
      hppDelta,
      hppDeltaPercent: Math.round(hppDeltaPercent * 100) / 100,
      marginDelta: Math.round(marginDelta * 100) / 100,
    }
  }
}