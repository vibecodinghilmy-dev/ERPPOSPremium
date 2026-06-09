// ============================================================================
// Inventory Runtime Engine — Repository
// Single source of truth for all ingredient stock data
// ============================================================================

import type {
  StockMovement,
  MovementType,
  MovementStatus,
  IngredientSnapshot,
  TransferRecord,
  TransferItemRecord,
  TransferStatus,
} from '../../services/inventory/types'

// ─── In-Memory Data Store ───────────────────────────────────────────

interface DBIngredient {
  id: string
  outlet_id: string
  name: string
  current_stock: number
  min_stock: number
  purchase_price: number
  unit_id: string
  is_active: boolean
}

interface DBUnit {
  id: string
  symbol: string
}

let movementStore: StockMovement[] = []
let movementCounter = 0
let transferStore: TransferRecord[] = []
let transferItemStore: TransferItemRecord[] = []
let transferCounter = 1000

// ─── Ingredients ────────────────────────────────────────────────────

const ingredients: DBIngredient[] = [
  { id: 'i1', outlet_id: 'outlet_1', name: 'Premium Milk Base', current_stock: 5000, min_stock: 1000, purchase_price: 1200, unit_id: 'u5', is_active: true },
  { id: 'i2', outlet_id: 'outlet_1', name: 'Beng-Beng Wafer', current_stock: 100, min_stock: 50, purchase_price: 2500, unit_id: 'u1', is_active: true },
  { id: 'i3', outlet_id: 'outlet_1', name: 'Chocolate Topping', current_stock: 2000, min_stock: 500, purchase_price: 50, unit_id: 'u3', is_active: true },
  { id: 'i4', outlet_id: 'outlet_1', name: 'Beef Patty Premium', current_stock: 50, min_stock: 30, purchase_price: 18500, unit_id: 'u1', is_active: true },
  { id: 'i5', outlet_id: 'outlet_1', name: 'Espresso Shot', current_stock: 2000, min_stock: 500, purchase_price: 300, unit_id: 'u5', is_active: true },
  { id: 'i6', outlet_id: 'outlet_1', name: 'Caramel Syrup', current_stock: 1000, min_stock: 200, purchase_price: 250, unit_id: 'u5', is_active: true },
  { id: 'i7', outlet_id: 'outlet_1', name: 'Ice Cube', current_stock: 10000, min_stock: 2000, purchase_price: 10, unit_id: 'u3', is_active: true },
  { id: 'i8', outlet_id: 'outlet_1', name: 'Burger Bun', current_stock: 80, min_stock: 40, purchase_price: 4500, unit_id: 'u1', is_active: true },
  { id: 'i9', outlet_id: 'outlet_1', name: 'Cheddar Cheese', current_stock: 2000, min_stock: 500, purchase_price: 180, unit_id: 'u3', is_active: true },
  { id: 'i10', outlet_id: 'outlet_1', name: 'Matcha Powder', current_stock: 500, min_stock: 100, purchase_price: 1500, unit_id: 'u3', is_active: true },
  { id: 'i11', outlet_id: 'outlet_1', name: 'Salad Mix', current_stock: 1000, min_stock: 300, purchase_price: 800, unit_id: 'u3', is_active: true },
  { id: 'i12', outlet_id: 'outlet_1', name: 'Salad Dressing', current_stock: 500, min_stock: 100, purchase_price: 1200, unit_id: 'u5', is_active: true },
  { id: 'pkg1', outlet_id: 'outlet_1', name: 'Plastic Cup 16oz', current_stock: 200, min_stock: 100, purchase_price: 1200, unit_id: 'u1', is_active: true },
  { id: 'pkg2', outlet_id: 'outlet_1', name: 'Paper Bag Small', current_stock: 100, min_stock: 50, purchase_price: 800, unit_id: 'u1', is_active: true },
  // Second outlet for transfer tests
  { id: 'i1', outlet_id: 'outlet_2', name: 'Premium Milk Base', current_stock: 200, min_stock: 100, purchase_price: 1200, unit_id: 'u5', is_active: true },
]

const units: DBUnit[] = [
  { id: 'u1', symbol: 'Pcs' },
  { id: 'u3', symbol: 'Gr' },
  { id: 'u5', symbol: 'Ml' },
]

// ─── Repository ─────────────────────────────────────────────────────

export class InventoryRepository {
  // ── Ingredient Lookup ───────────────────────────────────────────

  getIngredient(ingredientId: string, outletId: string): DBIngredient | null {
    return ingredients.find((i) => i.id === ingredientId && i.outlet_id === outletId) || null
  }

  getIngredientById(ingredientId: string): DBIngredient | null {
    return ingredients.find((i) => i.id === ingredientId) || null
  }

  getIngredientsByOutlet(outletId: string): DBIngredient[] {
    return ingredients.filter((i) => i.outlet_id === outletId && i.is_active)
  }

  getUnitSymbol(unitId: string): string {
    return units.find((u) => u.id === unitId)?.symbol || ''
  }

  // ── Stock Operations ────────────────────────────────────────────

  getStock(ingredientId: string, outletId: string): number {
    const ing = this.getIngredient(ingredientId, outletId)
    return ing ? ing.current_stock : 0
  }

  setStock(ingredientId: string, outletId: string, value: number): void {
    const ing = ingredients.find((i) => i.id === ingredientId && i.outlet_id === outletId)
    if (ing) {
      ing.current_stock = Math.max(0, value)
    }
  }

  addStock(ingredientId: string, outletId: string, delta: number): number {
    const ing = ingredients.find((i) => i.id === ingredientId && i.outlet_id === outletId)
    if (!ing) return 0
    ing.current_stock = Math.max(0, ing.current_stock + delta)
    return ing.current_stock
  }

  getAllIngredients(): DBIngredient[] {
    return [...ingredients]
  }

  // ── Movement Records ────────────────────────────────────────────

  recordMovement(movement: StockMovement): StockMovement {
    movementStore.push(movement)
    return movement
  }

  getMovements(
    ingredientId?: string,
    outletId?: string,
    limit = 50,
  ): StockMovement[] {
    let filtered = [...movementStore]
    if (ingredientId) filtered = filtered.filter((m) => m.ingredientId === ingredientId)
    if (outletId) filtered = filtered.filter((m) => m.outletId === outletId)
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
  }

  // ── Transfers ───────────────────────────────────────────────────

  createTransfer(record: TransferRecord): TransferRecord {
    transferStore.push(record)
    return record
  }

  getTransfer(transferId: string): TransferRecord | null {
    return transferStore.find((t) => t.id === transferId) || null
  }

  updateTransfer(transferId: string, updates: Partial<TransferRecord>): TransferRecord | null {
    const idx = transferStore.findIndex((t) => t.id === transferId)
    if (idx === -1) return null
    transferStore[idx] = { ...transferStore[idx], ...updates }
    return transferStore[idx]
  }

  getTransfersByOutlet(outletId: string): TransferRecord[] {
    return transferStore.filter(
      (t) => t.sourceOutletId === outletId || t.destinationOutletId === outletId,
    )
  }

  createTransferItems(items: TransferItemRecord[]): TransferItemRecord[] {
    transferItemStore.push(...items)
    return items
  }

  getTransferItems(transferId: string): TransferItemRecord[] {
    return transferItemStore.filter((ti) => ti.transferId === transferId)
  }

  // ── ID Generation ───────────────────────────────────────────────

  generateId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  generateTransferNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return `TRF-${date}-${String(++transferCounter).padStart(4, '0')}`
  }
}