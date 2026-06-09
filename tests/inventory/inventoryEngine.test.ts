// ============================================================================
// Inventory Runtime Engine — Integration Tests
// ============================================================================

import { InventoryRuntimeEngine } from '../../services/inventory/engine'
import { InventoryRepository } from '../../repositories/supabase/inventoryRepository'

// Mock the Supabase client
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => ({ range: () => Promise.resolve({ data: [], error: null, count: 0 }) }),
        }),
        in: () => ({ gte: () => ({ lte: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'test-id' }, error: null }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }) }),
      }),
    }),
  },
}))

// Use the in-memory repository for testing
import { InventoryRepository as MockInventoryRepo } from '../../repositories/inventory/inventoryRepository'

describe('InventoryRuntimeEngine', () => {
  let engine: InventoryRuntimeEngine
  let mockRepo: MockInventoryRepo

  beforeEach(() => {
    mockRepo = new MockInventoryRepo()
    engine = new InventoryRuntimeEngine(mockRepo as any)
  })

  describe('mutate', () => {
    it('should add stock on purchase movement', async () => {
      const result = await engine.mutate({
        outletId: 'outlet_1',
        ingredientId: 'i1',
        quantity: 100,
        movementType: 'purchase',
        unitCost: 1200,
        notes: 'Test purchase',
      })

      expect(result.success).toBe(true)
      expect(result.movement).not.toBeNull()
      expect(result.newStock).toBe(5100) // 5000 + 100
    })

    it('should deduct stock on sale movement', async () => {
      const result = await engine.mutate({
        outletId: 'outlet_1',
        ingredientId: 'i1',
        quantity: -200,
        movementType: 'sale',
        unitCost: 1200,
        notes: 'Test sale',
      })

      expect(result.success).toBe(true)
      expect(result.newStock).toBe(4800) // 5000 - 200
    })

    it('should warn on insufficient stock', async () => {
      const result = await engine.mutate({
        outletId: 'outlet_1',
        ingredientId: 'i4', // Beef Patty: stock 50, min 30
        quantity: -60, // Try to deduct 60
        movementType: 'sale',
        unitCost: 18500,
      })

      // Should still succeed but warn about low stock
      expect(result.warnings.some(w => w.type === 'insufficient_stock')).toBe(true)
    })

    it('should error on ingredient not found', async () => {
      const result = await engine.mutate({
        outletId: 'outlet_1',
        ingredientId: 'nonexistent',
        quantity: 10,
        movementType: 'purchase',
      })

      expect(result.success).toBe(false)
      expect(result.warnings.some(w => w.type === 'ingredient_not_found')).toBe(true)
    })
  })

  describe('consume', () => {
    it('should consume ingredients for a product', async () => {
      const result = await engine.consume({
        outletId: 'outlet_1',
        productId: 'p1', // Beng-Beng Ice
        productName: 'Beng-Beng Ice',
        quantity: 2,
      })

      expect(result.success).toBe(true)
      expect(result.movements.length).toBeGreaterThan(0)
    })
  })

  describe('recordWaste', () => {
    it('should record waste and deduct stock', async () => {
      const result = await engine.recordWaste({
        outletId: 'outlet_1',
        ingredientId: 'i1',
        ingredientName: 'Premium Milk Base',
        quantity: 1,
        unitCost: 1200,
        reason: 'Expired',
      })

      expect(result.success).toBe(true)
      expect(result.movement).not.toBeNull()
    })
  })

  describe('getStockSummary', () => {
    it('should return accurate stock summary', async () => {
      const summary = await engine.getStockSummary('outlet_1')
      expect(summary.totalIngredients).toBeGreaterThan(0)
      expect(summary.totalStockValue).toBeGreaterThan(0)
    })
  })
})

describe('Stock Validation & Edge Cases', () => {
  let engine: InventoryRuntimeEngine

  beforeEach(() => {
    const mockRepo = new MockInventoryRepo()
    engine = new InventoryRuntimeEngine(mockRepo as any)
  })

  it('should handle concurrent stock operations', async () => {
    const results = await Promise.all([
      engine.mutate({ outletId: 'outlet_1', ingredientId: 'i1', quantity: -100, movementType: 'sale', unitCost: 1200 }),
      engine.mutate({ outletId: 'outlet_1', ingredientId: 'i1', quantity: -200, movementType: 'sale', unitCost: 1200 }),
      engine.mutate({ outletId: 'outlet_1', ingredientId: 'i1', quantity: 500, movementType: 'purchase', unitCost: 1200 }),
    ])

    // All should succeed
    results.forEach(r => expect(r.success).toBe(true))
  })

  it('should create movement records', async () => {
    await engine.mutate({ outletId: 'outlet_1', ingredientId: 'i1', quantity: 50, movementType: 'purchase', unitCost: 1200 })

    const movements = await engine.getMovementHistory('i1')
    expect(movements.length).toBeGreaterThan(0)
    expect(movements[0].movement_type).toBe('purchase')
  })
})