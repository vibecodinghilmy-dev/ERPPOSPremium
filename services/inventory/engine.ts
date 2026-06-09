// ============================================================================
// Inventory Runtime Engine
// SINGLE SOURCE OF TRUTH for all stock changes.
// No module may directly modify stock — all changes go through this engine.
// ============================================================================

import { InventoryRepository } from '../../repositories/supabase/inventoryRepository'
import type { InventoryMovementRow } from '../../repositories/supabase/inventoryRepository'
import type { StockMutationInput, InventoryValidationError, ConsumeInput, TransferInput, WasteInput, OpnameInput } from './types'

export class InventoryRuntimeEngine {
  private repo: InventoryRepository

  constructor(repo?: InventoryRepository) {
    this.repo = repo || new InventoryRepository()
  }

  // ─── Stock Mutations ─────────────────────────────────────────────

  /**
   * Apply a stock mutation. Creates movement record, updates stock.
   * All stock changes MUST go through this method.
   */
  async mutate(input: StockMutationInput): Promise<{
    success: boolean
    movement: InventoryMovementRow | null
    newStock: number
    warnings: InventoryValidationError[]
  }> {
    const warnings: InventoryValidationError[] = []

    // Validate ingredient exists
    const ingredient = await this.repo.getIngredient(input.ingredientId)
    if (!ingredient) {
      return {
        success: false,
        movement: null,
        newStock: 0,
        warnings: [{ type: 'ingredient_not_found', message: `Ingredient ${input.ingredientId} not found`, severity: 'error' }],
      }
    }

    // Check for negative stock (only warn for sale/consumption)
    const currentStock = ingredient.current_stock
    const newStock = currentStock + input.quantity

    if (newStock < 0) {
      warnings.push({
        type: 'negative_stock',
        message: `${ingredient.name} would have negative stock (${currentStock} ${input.quantity > 0 ? '+' : ''}${input.quantity} = ${newStock})`,
        severity: 'error',
      })
    }

    // Check low stock
    if (newStock > 0 && newStock < ingredient.min_stock) {
      warnings.push({
        type: 'insufficient_stock',
        message: `${ingredient.name} is below minimum stock (${newStock} < ${ingredient.min_stock})`,
        severity: 'warning',
      })
    }

    // Record movement
    try {
      const movement = await this.repo.recordMovement({
        outlet_id: input.outletId,
        ingredient_id: input.ingredientId,
        movement_type: input.movementType,
        quantity: input.quantity,
        unit_cost: input.unitCost || ingredient.purchase_price,
        reference_id: input.referenceId || null,
        reference_type: input.referenceType || null,
        notes: input.notes || null,
        created_by: input.createdBy || null,
      })

      // Update stock
      await this.repo.setStock(input.ingredientId, newStock)

      return {
        success: warnings.length === 0 || warnings.every((w) => w.severity === 'warning'),
        movement,
        newStock: Math.max(0, newStock),
        warnings,
      }
    } catch (error: any) {
      return {
        success: false,
        movement: null,
        newStock: currentStock,
        warnings: [...warnings, { type: 'invalid_quantity', message: error.message, severity: 'error' }],
      }
    }
  }

  /**
   * Consume ingredients for a product sale (from recipe)
   */
  async consume(input: ConsumeInput): Promise<{
    success: boolean
    movements: InventoryMovementRow[]
    warnings: InventoryValidationError[]
  }> {
    const movements: InventoryMovementRow[] = []
    const warnings: InventoryValidationError[] = []

    // Get recipe for this product
    const { getRecipeConsumption } = await import('../../services/hpp/index')
    const consumption = await getRecipeConsumption(input.productId, input.quantity)

    for (const item of consumption) {
      const result = await this.mutate({
        outletId: input.outletId,
        ingredientId: item.ingredientId,
        quantity: -(item.quantity * input.quantity),
        movementType: 'sale',
        unitCost: item.unitCost,
        referenceId: input.productId,
        referenceType: 'product',
        notes: `Consumed for ${input.productName} x${input.quantity}`,
        createdBy: input.createdBy,
      })

      if (result.movement) movements.push(result.movement)

      // Only propagate errors, not warnings (warnings are expected for low stock)
      const errors = result.warnings.filter((w) => w.severity === 'error')
      if (errors.length > 0) {
        warnings.push(...errors)
      }

      // Collect low stock warnings
      const lowStock = result.warnings.filter((w) => w.type === 'insufficient_stock')
      if (lowStock.length > 0) {
        warnings.push(...lowStock)
      }
    }

    return { success: warnings.filter((w) => w.severity === 'error').length === 0, movements, warnings }
  }

  // ─── Transfers ──────────────────────────────────────────────────

  async transferStock(input: TransferInput): Promise<{
    success: boolean
    movements: InventoryMovementRow[]
    warnings: InventoryValidationError[]
  }> {
    const movements: InventoryMovementRow[] = []
    const warnings: InventoryValidationError[] = []

    for (const item of input.items) {
      // Deduct from source
      const outResult = await this.mutate({
        outletId: input.sourceOutletId,
        ingredientId: item.ingredientId,
        quantity: -item.quantity,
        movementType: 'transfer',
        unitCost: item.unitCost,
        referenceId: null,
        referenceType: 'transfer',
        notes: `Transfer out to ${input.destinationOutletId}`,
        createdBy: input.requestedBy,
      })

      if (outResult.movement) movements.push(outResult.movement)
      const errors = outResult.warnings.filter((w) => w.severity === 'error')
      if (errors.length > 0) {
        warnings.push(...errors)
        continue // Don't add to destination if source failed
      }

      // Add to destination
      const inResult = await this.mutate({
        outletId: input.destinationOutletId,
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        movementType: 'transfer',
        unitCost: item.unitCost,
        referenceId: null,
        referenceType: 'transfer',
        notes: `Transfer in from ${input.sourceOutletId}`,
        createdBy: input.requestedBy,
      })

      if (inResult.movement) movements.push(inResult.movement)
    }

    return { success: warnings.filter((w) => w.severity === 'error').length === 0, movements, warnings }
  }

  // ─── Waste ──────────────────────────────────────────────────────

  async recordWaste(input: WasteInput): Promise<{
    success: boolean
    movement: InventoryMovementRow | null
    warnings: InventoryValidationError[]
  }> {
    return this.mutate({
      outletId: input.outletId,
      ingredientId: input.ingredientId,
      quantity: -input.quantity,
      movementType: 'waste',
      unitCost: input.unitCost,
      referenceId: null,
      referenceType: 'waste',
      notes: `Waste: ${input.reason}`,
      createdBy: input.createdBy,
    })
  }

  // ─── Stock Opname ───────────────────────────────────────────────

  /**
   * Process stock opname counts and adjust inventory
   */
  async processOpname(input: OpnameInput): Promise<{
    success: boolean
    adjustments: Array<{
      ingredientId: string
      ingredientName: string
      oldStock: number
      newStock: number
      difference: number
    }>
    movements: InventoryMovementRow[]
    warnings: InventoryValidationError[]
  }> {
    const adjustments: Array<{
      ingredientId: string
      ingredientName: string
      oldStock: number
      newStock: number
      difference: number
    }> = []

    const movements: InventoryMovementRow[] = []
    const warnings: InventoryValidationError[] = []

    for (const item of input.items) {
      const ingredient = await this.repo.getIngredient(item.ingredientId)
      if (!ingredient) {
        warnings.push({
          type: 'ingredient_not_found',
          message: `Ingredient ${item.ingredientName} not found`,
          severity: 'error',
        })
        continue
      }

      const oldStock = ingredient.current_stock
      const difference = item.physicalStock - oldStock

      if (difference === 0) continue

      const result = await this.mutate({
        outletId: input.outletId,
        ingredientId: item.ingredientId,
        quantity: difference,
        movementType: 'opname',
        unitCost: item.unitCost || ingredient.purchase_price,
        referenceId: input.sessionId,
        referenceType: 'opname',
        notes: `Opname adjustment: system=${oldStock}, physical=${item.physicalStock}`,
        createdBy: input.createdBy,
      })

      if (result.movement) movements.push(result.movement)
      adjustments.push({
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        oldStock,
        newStock: item.physicalStock,
        difference,
      })
    }

    return {
      success: warnings.filter((w) => w.severity === 'error').length === 0,
      adjustments,
      movements,
      warnings,
    }
  }

  // ─── Purchasing ─────────────────────────────────────────────────

  /**
   * Receive a purchase order — adds stock for each item
   */
  async receivePurchase(
    outletId: string,
    items: Array<{
      ingredientId: string
      ingredientName: string
      quantity: number
      unitPrice: number
    }>,
    poNumber: string,
    userId?: string,
  ): Promise<{
    success: boolean
    movements: InventoryMovementRow[]
    warnings: InventoryValidationError[]
  }> {
    const movements: InventoryMovementRow[] = []
    const warnings: InventoryValidationError[] = []

    for (const item of items) {
      const result = await this.mutate({
        outletId,
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        movementType: 'purchase',
        unitCost: item.unitPrice,
        referenceId: null,
        referenceType: 'purchase',
        notes: `Purchase receipt: ${poNumber} - ${item.ingredientName}`,
        createdBy: userId,
      })

      if (result.movement) movements.push(result.movement)
      if (result.warnings.length > 0) warnings.push(...result.warnings)
    }

    return { success: true, movements, warnings }
  }

  // ─── Stock Status ───────────────────────────────────────────────

  /**
   * Get stock status summary for an outlet
   */
  async getStockSummary(outletId: string): Promise<{
    totalIngredients: number
    totalStockValue: number
    lowStockCount: number
    outOfStockCount: number
  }> {
    const ingredients = await this.repo.getIngredients(outletId)
    return {
      totalIngredients: ingredients.length,
      totalStockValue: ingredients.reduce((sum, i) => sum + i.current_stock * i.purchase_price, 0),
      lowStockCount: ingredients.filter((i) => i.current_stock > 0 && i.current_stock < i.min_stock).length,
      outOfStockCount: ingredients.filter((i) => i.current_stock === 0).length,
    }
  }

  /**
   * Get movement history
   */
  async getMovementHistory(
    ingredientId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<InventoryMovementRow[]> {
    return this.repo.getMovements(ingredientId, options)
  }
}

// Singleton
let instance: InventoryRuntimeEngine | null = null

export function getInventoryEngine(repo?: InventoryRepository): InventoryRuntimeEngine {
  if (!instance) {
    instance = new InventoryRuntimeEngine(repo)
  }
  return instance
}

export { InventoryRepository }