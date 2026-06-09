// ============================================================================
// POS Transaction Engine — Sale Repository
// Manages sale records, inventory, and transaction state
// ============================================================================

import type {
  SaleRecord,
  SaleItemRecord,
  StockValidationResult,
  ConsumptionRecord,
} from '../../services/pos/types'

// ─── In-memory stores (will be replaced by Supabase) ────────────────

interface DBProduct {
  id: string
  name: string
  selling_price: number
  hpp: number
  is_available: boolean
}

interface DBRecipeItem {
  ingredient_id: string
  quantity: number
  unit: string
}

interface DBIngredient {
  id: string
  name: string
  current_stock: number
  unit: string
}

let saleStore: SaleRecord[] = []
let saleItemStore: SaleItemRecord[] = []
let saleCounter = 0

// ─── Mock Data ──────────────────────────────────────────────────────

const products: DBProduct[] = [
  { id: 'p1', name: 'Beng-Beng Ice', selling_price: 15000, hpp: 4200, is_available: true },
  { id: 'p2', name: 'Premium Cheeseburger', selling_price: 75000, hpp: 25400, is_available: true },
  { id: 'p3', name: 'Iced Caramel Macchiato', selling_price: 40000, hpp: 11200, is_available: true },
  { id: 'p4', name: 'Matcha Latte', selling_price: 35000, hpp: 8750, is_available: true },
  { id: 'p5', name: 'Salmon Poke Bowl', selling_price: 65000, hpp: 24700, is_available: false },
  { id: 'p6', name: 'Chicken Salad', selling_price: 52000, hpp: 18200, is_available: true },
]

// Recipe: product_id → ingredient consumptions
const recipes: Record<string, DBRecipeItem[]> = {
  p1: [
    { ingredient_id: 'i1', quantity: 200, unit: 'ml' },  // Milk
    { ingredient_id: 'i7', quantity: 100, unit: 'g' },    // Ice
  ],
  p2: [
    { ingredient_id: 'i4', quantity: 1, unit: 'pcs' },    // Beef patty
    { ingredient_id: 'i8', quantity: 1, unit: 'pcs' },    // Bun
    { ingredient_id: 'i9', quantity: 30, unit: 'g' },     // Cheese
  ],
  p3: [
    { ingredient_id: 'i5', quantity: 60, unit: 'ml' },    // Espresso
    { ingredient_id: 'i1', quantity: 200, unit: 'ml' },   // Milk
    { ingredient_id: 'i6', quantity: 30, unit: 'ml' },    // Syrup
  ],
  p4: [
    { ingredient_id: 'i10', quantity: 20, unit: 'g' },    // Matcha powder
    { ingredient_id: 'i1', quantity: 250, unit: 'ml' },   // Milk
  ],
  p6: [
    { ingredient_id: 'i11', quantity: 150, unit: 'g' },   // Salad mix
    { ingredient_id: 'i12', quantity: 50, unit: 'ml' },   // Dressing
  ],
}

// Packaging consumed per product
const packagingRecipes: Record<string, DBRecipeItem[]> = {
  p1: [{ ingredient_id: 'pkg1', quantity: 1, unit: 'pcs' }],
  p2: [{ ingredient_id: 'pkg2', quantity: 1, unit: 'pcs' }],
  p3: [{ ingredient_id: 'pkg1', quantity: 1, unit: 'pcs' }],
  p4: [{ ingredient_id: 'pkg1', quantity: 1, unit: 'pcs' }],
}

const ingredients: DBIngredient[] = [
  { id: 'i1', name: 'Premium Milk Base', current_stock: 5000, unit: 'ml' },
  { id: 'i4', name: 'Beef Patty Premium', current_stock: 50, unit: 'pcs' },
  { id: 'i5', name: 'Espresso Shot', current_stock: 2000, unit: 'ml' },
  { id: 'i6', name: 'Caramel Syrup', current_stock: 1000, unit: 'ml' },
  { id: 'i7', name: 'Ice Cube', current_stock: 10000, unit: 'g' },
  { id: 'i8', name: 'Burger Bun', current_stock: 80, unit: 'pcs' },
  { id: 'i9', name: 'Cheddar Cheese', current_stock: 2000, unit: 'g' },
  { id: 'i10', name: 'Matcha Powder', current_stock: 500, unit: 'g' },
  { id: 'i11', name: 'Salad Mix', current_stock: 1000, unit: 'g' },
  { id: 'i12', name: 'Salad Dressing', current_stock: 500, unit: 'ml' },
  { id: 'pkg1', name: 'Plastic Cup 16oz', current_stock: 200, unit: 'pcs' },
  { id: 'pkg2', name: 'Paper Bag Small', current_stock: 100, unit: 'pcs' },
]

// ─── Repository ─────────────────────────────────────────────────────

export class SaleRepository {
  // ── Product Lookup ──────────────────────────────────────────────

  getProduct(productId: string): DBProduct | null {
    return products.find((p) => p.id === productId) || null
  }

  getProducts(): DBProduct[] {
    return [...products]
  }

  // ── Recipe Lookup ───────────────────────────────────────────────

  getRecipe(productId: string): DBRecipeItem[] {
    return recipes[productId] || []
  }

  getPackagingRecipe(productId: string): DBRecipeItem[] {
    return packagingRecipes[productId] || []
  }

  // ── Ingredient Lookup & Stock ────────────────────────────────────

  getIngredient(ingredientId: string): DBIngredient | null {
    return ingredients.find((i) => i.id === ingredientId) || null
  }

  getIngredientStock(ingredientId: string): number {
    const ing = this.getIngredient(ingredientId)
    return ing ? ing.current_stock : 0
  }

  updateIngredientStock(ingredientId: string, delta: number): void {
    const ing = ingredients.find((i) => i.id === ingredientId)
    if (ing) {
      ing.current_stock = Math.max(0, ing.current_stock + delta)
    }
  }

  // ── Sale CRUD ───────────────────────────────────────────────────

  createSale(record: SaleRecord): SaleRecord {
    saleStore.push(record)
    return record
  }

  getSale(saleId: string): SaleRecord | null {
    return saleStore.find((s) => s.id === saleId) || null
  }

  updateSale(saleId: string, updates: Partial<SaleRecord>): SaleRecord | null {
    const idx = saleStore.findIndex((s) => s.id === saleId)
    if (idx === -1) return null
    saleStore[idx] = { ...saleStore[idx], ...updates }
    return saleStore[idx]
  }

  getSalesByOutlet(outletId: string): SaleRecord[] {
    return saleStore.filter((s) => s.outletId === outletId)
  }

  // ── Sale Items CRUD ─────────────────────────────────────────────

  createSaleItems(items: SaleItemRecord[]): SaleItemRecord[] {
    saleItemStore.push(...items)
    return items
  }

  getSaleItems(saleId: string): SaleItemRecord[] {
    return saleItemStore.filter((si) => si.saleId === saleId)
  }

  // ── Sale Number Generation ──────────────────────────────────────

  generateSaleNumber(outletCode: string): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return `${outletCode}/${date}/${String(++saleCounter).padStart(4, '0')}`
  }

  // ── Stock Validation ────────────────────────────────────────────

  validateStock(
    productId: string,
    quantity: number,
  ): StockValidationResult {
    const product = this.getProduct(productId)
    if (!product) {
      return {
        productId,
        productName: 'Unknown',
        isAvailable: false,
        requested: quantity,
        available: 0,
        reason: 'Product not found',
      }
    }

    if (!product.is_available) {
      return {
        productId,
        productName: product.name,
        isAvailable: false,
        requested: quantity,
        available: 0,
        reason: 'Product is not available',
      }
    }

    // Check recipe ingredients
    const recipe = this.getRecipe(productId)
    for (const item of recipe) {
      const stock = this.getIngredientStock(item.ingredient_id)
      const needed = item.quantity * quantity
      if (stock < needed) {
        const ing = this.getIngredient(item.ingredient_id)
        return {
          productId,
          productName: product.name,
          isAvailable: false,
          requested: quantity,
          available: Math.floor(stock / item.quantity),
          reason: `Insufficient ${ing?.name || 'ingredient'}: need ${needed}${item.unit}, have ${stock}${item.unit}`,
        }
      }
    }

    // Check packaging
    const packaging = this.getPackagingRecipe(productId)
    for (const item of packaging) {
      const stock = this.getIngredientStock(item.ingredient_id)
      const needed = item.quantity * quantity
      if (stock < needed) {
        return {
          productId,
          productName: product.name,
          isAvailable: false,
          requested: quantity,
          available: Math.floor(stock / item.quantity),
          reason: `Insufficient packaging: need ${needed}${item.unit}, have ${stock}${item.unit}`,
        }
      }
    }

    return {
      productId,
      productName: product.name,
      isAvailable: true,
      requested: quantity,
      available: quantity,
    }
  }

  // ── Inventory Consumption Calculation ────────────────────────────

  calculateConsumption(
    productId: string,
    quantity: number,
  ): ConsumptionRecord[] {
    const records: ConsumptionRecord[] = []

    // Ingredient consumption
    const recipe = this.getRecipe(productId)
    for (const item of recipe) {
      const ing = this.getIngredient(item.ingredient_id)
      if (ing) {
        records.push({
          ingredientId: item.ingredient_id,
          ingredientName: ing.name,
          quantity: -(item.quantity * quantity),
          unitSymbol: item.unit,
          movementType: 'sale',
        })
      }
    }

    // Packaging consumption
    const packaging = this.getPackagingRecipe(productId)
    for (const item of packaging) {
      const ing = this.getIngredient(item.ingredient_id)
      if (ing) {
        records.push({
          ingredientId: item.ingredient_id,
          ingredientName: ing.name,
          quantity: -(item.quantity * quantity),
          unitSymbol: item.unit,
          movementType: 'packaging',
        })
      }
    }

    return records
  }

  // ── Id Generation ───────────────────────────────────────────────

  generateId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }
}