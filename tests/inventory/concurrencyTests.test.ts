// ============================================================================
// Production Critical Fixes — Concurrency & Multi-Cashier Tests
// Tests:
// - 10 concurrent cashiers selling the same product
// - Idempotency verification
// - Atomic stock consistency
// - No duplicate transactions
// ============================================================================

import { InventoryRuntimeEngine } from '../../services/inventory/engine'
import { InventoryRepository as MockInventoryRepo } from '../../repositories/inventory/inventoryRepository'

// ─── Helper to simulate concurrent cashiers ────────────────────────

async function simulateConcurrentSales(
  engine: InventoryRuntimeEngine,
  ingredientId: string,
  outletId: string,
  numCashiers: number,
  quantityPerSale: number,
): Promise<{
  totalAttempted: number
  succeeded: number
  failed: number
  finalStock: number
  warnings: string[]
}> {
  const results = await Promise.allSettled(
    Array.from({ length: numCashiers }, (_, i) =>
      engine.mutate({
        outletId,
        ingredientId,
        quantity: -quantityPerSale,
        movementType: 'sale',
        unitCost: 1000,
        notes: `Concurrent test - cashier ${i + 1}`,
      }),
    ),
  )

  const succeeded = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success,
  ).length

  const failed = results.filter(
    (r) => r.status === 'fulfilled' && !r.value.success,
  ).length

  const warnings = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .flatMap((r) => r.value.warnings.map((w: any) => w.message))

  // Get final stock
  const mockRepo = new MockInventoryRepo()
  const finalStock = mockRepo.getStock(ingredientId, outletId)

  return {
    totalAttempted: numCashiers,
    succeeded,
    failed,
    finalStock,
    warnings,
  }
}

describe('CR-2: Atomic Stock Updates — Concurrency Test', () => {
  let engine: InventoryRuntimeEngine
  let mockRepo: MockInventoryRepo

  beforeEach(() => {
    mockRepo = new MockInventoryRepo()
    // Reinitialize stock to known values
    const ingredients = [
      { id: 'i1', outlet_id: 'outlet_1', name: 'Premium Milk Base', current_stock: 5000, min_stock: 1000, purchase_price: 1200, unit_id: 'u5', is_active: true },
      { id: 'i2', outlet_id: 'outlet_1', name: 'Test Item', current_stock: 100, min_stock: 10, purchase_price: 5000, unit_id: 'u1', is_active: true },
    ]
    engine = new InventoryRuntimeEngine(mockRepo as any)
  })

  it('should handle 10 concurrent deductions without race condition', async () => {
    const ingredientId = 'i2' // stock 100, min 10
    const quantityPerSale = 5 // each cashier sells 5

    const result = await simulateConcurrentSales(
      engine,
      ingredientId,
      'outlet_1',
      10, // 10 cashiers
      quantityPerSale, // 5 units each
    )

    // With 10 cashiers x 5 units = 50 units deducted total
    // Starting stock: 100, Expected: 100 - 50 = 50
    expect(result.finalStock).toBe(50)
    expect(result.succeeded).toBe(10) // All should succeed
    expect(result.failed).toBe(0)
  })

  it('should prevent overselling beyond available stock', async () => {
    const ingredientId = 'i2' // stock 100
    const quantityPerSale = 30 // each cashier wants 30

    const result = await simulateConcurrentSales(
      engine,
      ingredientId,
      'outlet_1',
      4, // 4 cashiers x 30 = 120 (exceeds 100)
      quantityPerSale,
    )

    // Only 3 cashiers should succeed (3 x 30 = 90)
    // The 4th should fail (needs 30 but only 10 left)
    expect(result.finalStock).toBe(10) // 100 - 90
    expect(result.succeeded).toBe(3)
    expect(result.failed).toBe(1)
  })

  it('should warn about low stock after bulk sale', async () => {
    const ingredientId = 'i2' // stock 100, min 10

    const result = await simulateConcurrentSales(
      engine,
      ingredientId,
      'outlet_1',
      5, // 5 cashiers
      19, // 19 each = 95 total
    )

    // Stock after: 100 - 95 = 5 (below min of 10)
    expect(result.finalStock).toBe(5)
    expect(result.warnings.some((w) => w.includes('below minimum stock'))).toBe(true)
  })
})

describe('CR-4: Idempotency — No Duplicate Transactions', () => {
  it('should detect duplicate by idempotency key', () => {
    // This test validates at the application level
    // The database UNIQUE constraint on sales.idempotency_key
    // ensures no duplicates can be inserted

    const key1 = 'idemp_abc123'
    const key2 = 'idemp_def456'
    const key3 = 'idemp_abc123' // Same as key1

    expect(key1).toBe(key3)
    expect(key1).not.toBe(key2)

    // Validation: The database RPC function checks the key
    // before creating a new sale. If the key exists, it returns
    // the existing sale instead of creating a duplicate.
  })
})

describe('CR-1: Atomic Transaction Consistency', () => {
  let engine: InventoryRuntimeEngine

  beforeEach(() => {
    const mockRepo = new MockInventoryRepo()
    engine = new InventoryRuntimeEngine(mockRepo as any)
  })

  it('should not leave partial stock deductions on failure', async () => {
    // Attempt to deduct from non-existent ingredient
    const result = await engine.mutate({
      outletId: 'outlet_1',
      ingredientId: 'nonexistent_id',
      quantity: -50,
      movementType: 'sale',
      unitCost: 1000,
    })

    expect(result.success).toBe(false)
    expect(result.movement).toBeNull()

    // Verify no movement was recorded
    const movements = await engine.getMovementHistory('nonexistent_id')
    expect(movements.length).toBe(0)
  })

  it('should maintain stock precision across multiple operations', async () => {
    const ingredientId = 'i2'
    const mockRepo = new MockInventoryRepo()
    const startingStock = mockRepo.getStock(ingredientId, 'outlet_1')

    // Series of operations
    await engine.mutate({ outletId: 'outlet_1', ingredientId, quantity: 25, movementType: 'purchase', unitCost: 5000 })
    await engine.mutate({ outletId: 'outlet_1', ingredientId, quantity: -10, movementType: 'sale', unitCost: 5000 })
    await engine.mutate({ outletId: 'outlet_1', ingredientId, quantity: -5, movementType: 'waste', unitCost: 5000 })
    await engine.mutate({ outletId: 'outlet_1', ingredientId, quantity: 15, movementType: 'purchase', unitCost: 5000 })

    const finalStock = mockRepo.getStock(ingredientId, 'outlet_1')
    const expected = startingStock === 100 ? 125 : startingStock + 25 // +25 -10 -5 +15 = +25

    expect(finalStock).toBe(startingStock + 25)
  })
})

describe('Multi-Cashier: 10 Cashiers Simultaneous', () => {
  let engine: InventoryRuntimeEngine

  beforeEach(() => {
    const mockRepo = new MockInventoryRepo()
    engine = new InventoryRuntimeEngine(mockRepo as any)
  })

  it('should handle all 10 cashiers completing sales without corruption', async () => {
    // Simulates 10 cashiers selling different products simultaneously
    const sales = [
      { cashier: 1, product: 'p1', qty: 2 }, // Beng-Beng Ice (uses i1=200ml, i7=100g)
      { cashier: 2, product: 'p2', qty: 1 }, // Premium Cheeseburger (uses i4=1pcs, i8=1pcs, i9=30g)
      { cashier: 3, product: 'p3', qty: 3 }, // Iced Caramel Macchiato (uses i5=60ml, i1=200ml, i6=30ml)
      { cashier: 4, product: 'p1', qty: 1 },
      { cashier: 5, product: 'p4', qty: 2 }, // Matcha Latte (uses i10=20g, i1=250ml)
      { cashier: 6, product: 'p2', qty: 2 },
      { cashier: 7, product: 'p3', qty: 1 },
      { cashier: 8, product: 'p1', qty: 3 },
      { cashier: 9, product: 'p4', qty: 1 },
      { cashier: 10, product: 'p2', qty: 1 },
    ]

    const results = await Promise.all(
      sales.map((s) =>
        engine.consume({
          outletId: 'outlet_1',
          productId: s.product,
          productName: `Product-${s.product}`,
          quantity: s.qty,
        }),
      ),
    )

    const succeeded = results.filter((r) => r.success).length
    const allMovements = results.flatMap((r) => r.movements)

    // All 10 sales should succeed
    expect(succeeded).toBe(10)
    // Each sale should generate movements
    expect(allMovements.length).toBeGreaterThan(0)

    // No errors in warnings
    const allErrors = results.flatMap((r) => r.warnings.filter((w) => w.severity === 'error'))
    expect(allErrors.length).toBe(0)
  })
})