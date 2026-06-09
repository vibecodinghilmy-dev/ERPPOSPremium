// ============================================================================
// ProStream ERP F&B — Supabase Inventory Repository
// Single source of truth for all ingredient stock data
// ============================================================================

import { supabase } from '../../src/lib/supabase'

export interface IngredientRow {
  id: string
  outlet_id: string
  category_id: string | null
  supplier_id: string | null
  unit_id: string
  name: string
  sku: string | null
  purchase_price: number
  current_stock: number
  min_stock: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InventoryMovementRow {
  id: string
  outlet_id: string
  ingredient_id: string
  movement_type: 'purchase' | 'sale' | 'waste' | 'adjustment' | 'transfer' | 'production' | 'opname'
  quantity: number
  unit_cost: number
  total_cost: number
  reference_id: string | null
  reference_type: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface StockOpnameSessionRow {
  id: string
  outlet_id: string
  name: string
  status: string
  total_items: number
  counted_items: number
  discrepancy_count: number
  total_discrepancy_value: number
  created_by: string | null
  completed_at: string | null
  created_at: string
}

export interface StockOpnameItemRow {
  id: string
  session_id: string
  ingredient_id: string
  system_stock: number
  physical_stock: number | null
  difference: number
  unit_cost: number
  difference_value: number
  notes: string | null
}

export class InventoryRepository {
  /**
   * Get ingredients for an outlet
   */
  async getIngredients(outletId: string): Promise<IngredientRow[]> {
    const { data, error } = await supabase
      .from('ingredients')
      .select(`
        *,
        units (name, symbol),
        ingredient_categories (name, color),
        suppliers (name)
      `)
      .eq('outlet_id', outletId)
      .eq('is_active', true)
      .order('name')

    if (error) throw new Error(`Failed to fetch ingredients: ${error.message}`)
    return data || []
  }

  /**
   * Get a single ingredient
   */
  async getIngredient(ingredientId: string): Promise<IngredientRow | null> {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', ingredientId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch ingredient: ${error.message}`)
    }
    return data
  }

  /**
   * Get current stock level for an ingredient
   */
  async getStock(ingredientId: string): Promise<number> {
    const ing = await this.getIngredient(ingredientId)
    return ing?.current_stock ?? 0
  }

  /**
   * Update stock level — ONLY called by InventoryRuntimeEngine
   */
  async setStock(ingredientId: string, value: number): Promise<void> {
    const { error } = await supabase
      .from('ingredients')
      .update({ current_stock: Math.max(0, value), updated_at: new Date().toISOString() })
      .eq('id', ingredientId)

    if (error) throw new Error(`Failed to update stock: ${error.message}`)
  }

  /**
   * Record an inventory movement (audit trail)
   */
  async recordMovement(movement: {
    outlet_id: string
    ingredient_id: string
    movement_type: string
    quantity: number
    unit_cost: number
    reference_id?: string | null
    reference_type?: string | null
    notes?: string | null
    created_by?: string | null
  }): Promise<InventoryMovementRow> {
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert({
        outlet_id: movement.outlet_id,
        ingredient_id: movement.ingredient_id,
        movement_type: movement.movement_type,
        quantity: movement.quantity,
        unit_cost: movement.unit_cost,
        total_cost: movement.quantity * movement.unit_cost,
        reference_id: movement.reference_id || null,
        reference_type: movement.reference_type || null,
        notes: movement.notes || null,
        created_by: movement.created_by || null,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to record movement: ${error.message}`)
    return data
  }

  /**
   * Get movements for an ingredient
   */
  async getMovements(
    ingredientId: string,
    options?: { outletId?: string; limit?: number; offset?: number },
  ): Promise<InventoryMovementRow[]> {
    let query = supabase
      .from('inventory_movements')
      .select('*')
      .eq('ingredient_id', ingredientId)
      .order('created_at', { ascending: false })
      .limit(options?.limit || 50)

    if (options?.outletId) {
      query = query.eq('outlet_id', options.outletId)
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch movements: ${error.message}`)
    return data || []
  }

  /**
   * Get low stock ingredients (current_stock < min_stock)
   */
  async getLowStockIngredients(outletId: string): Promise<IngredientRow[]> {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('is_active', true)
      .lt('current_stock', supabase.rpc('get_col_ref', { tbl: 'ingredients', col: 'min_stock' }) as any)
      .order('current_stock', { ascending: true })

    if (error) {
      // Fallback: fetch all and filter client-side
      const all = await this.getIngredients(outletId)
      return all.filter((i) => i.current_stock < i.min_stock)
    }
    return data || []
  }

  // ─── Stock Opname ─────────────────────────────────────────────────

  async createOpnameSession(session: {
    outlet_id: string
    name: string
    created_by: string | null
  }): Promise<StockOpnameSessionRow> {
    const { data, error } = await supabase
      .from('opname_sessions')
      .insert(session)
      .select()
      .single()

    if (error) throw new Error(`Failed to create opname session: ${error.message}`)
    return data
  }

  async getOpnameSessions(outletId: string): Promise<StockOpnameSessionRow[]> {
    const { data, error } = await supabase
      .from('opname_sessions')
      .select('*')
      .eq('outlet_id', outletId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch opname sessions: ${error.message}`)
    return data || []
  }

  async createOpnameItems(items: StockOpnameItemRow[]): Promise<void> {
    const { error } = await supabase.from('opname_items').insert(items as any)
    if (error) throw new Error(`Failed to create opname items: ${error.message}`)
  }

  async getOpnameItems(sessionId: string): Promise<StockOpnameItemRow[]> {
    const { data, error } = await supabase
      .from('opname_items')
      .select('*')
      .eq('session_id', sessionId)

    if (error) throw new Error(`Failed to fetch opname items: ${error.message}`)
    return data || []
  }

  // ─── Categories ──────────────────────────────────────────────────

  async getCategories(outletId: string): Promise<Array<{ id: string; name: string; color: string | null }>> {
    const { data, error } = await supabase
      .from('ingredient_categories')
      .select('id, name, color')
      .eq('outlet_id', outletId)

    if (error) throw new Error(`Failed to fetch categories: ${error.message}`)
    return data || []
  }

  // ─── Units ───────────────────────────────────────────────────────

  async getUnits(): Promise<Array<{ id: string; name: string; symbol: string }>> {
    const { data, error } = await supabase.from('units').select('id, name, symbol')
    if (error) throw new Error(`Failed to fetch units: ${error.message}`)
    return data || []
  }
}