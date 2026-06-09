// ============================================================================
// HPP Engine — Recipe Repository
// Handles recipe fetching, ingredient lookups, unit conversions
// ============================================================================

import type {
  ResolvedRecipeItem,
  ResolvedSemiFinishedItem,
  UnitConversionResult,
  HPPWarning,
} from '../../services/hpp/types'

// ─── In-memory mock data store (will be replaced by Supabase queries) ──

// Types matching DB schema
interface DBRecipeHeader {
  id: string
  outlet_id: string
  product_id: string
  version: number
  status: string
  total_hpp: number
}

interface DBRecipeItem {
  id: string
  recipe_id: string
  ingredient_id: string
  quantity: number
  unit_id: string
  unit_cost: number
  total_cost: number
  sort_order: number
}

interface DBIngredient {
  id: string
  outlet_id: string
  unit_id: string
  name: string
  purchase_price: number
  current_stock: number
}

interface DBUnit {
  id: string
  name: string
  symbol: string
}

interface DBUnitConversion {
  id: string
  outlet_id: string
  from_unit_id: string
  to_unit_id: string
  conversion_factor: number
  is_exact: boolean
}

interface DBSemiFinished {
  id: string
  outlet_id: string
  unit_id: string
  name: string
  current_stock: number
  standard_yield: number
}

interface DBSemiFinishedRecipeItem {
  id: string
  outlet_id: string
  semi_finished_id: string
  ingredient_id: string | null
  sub_semi_finished_id: string | null
  quantity: number
  unit_id: string
  unit_cost: number
  sort_order: number
}

interface DBProduct {
  id: string
  outlet_id: string
  name: string
  selling_price: number
  hpp: number
}

interface DBPackagingCost {
  id: string
  product_id: string
  packaging_item_id: string
  quantity_per_product: number
  unit_cost_at_calculation: number
  total_packaging_hpp: number
  is_active: boolean
}

interface DBPackagingItem {
  id: string
  outlet_id: string
  unit_id: string
  name: string
  purchase_price: number
}

// ─── Mock Data ──────────────────────────────────────────────────────

const units: DBUnit[] = [
  { id: 'u1', name: 'Pieces', symbol: 'Pcs' },
  { id: 'u2', name: 'Kilogram', symbol: 'Kg' },
  { id: 'u3', name: 'Gram', symbol: 'Gr' },
  { id: 'u4', name: 'Liter', symbol: 'Ltr' },
  { id: 'u5', name: 'Milliliter', symbol: 'Ml' },
  { id: 'u6', name: 'Bottle', symbol: 'Btl' },
  { id: 'u7', name: 'Pack', symbol: 'Pack' },
]

const ingredients: DBIngredient[] = [
  { id: 'i1', outlet_id: 'outlet_1', unit_id: 'u4', name: 'Premium Milk Base', purchase_price: 1200, current_stock: 50 },
  { id: 'i2', outlet_id: 'outlet_1', unit_id: 'u1', name: 'Beng-Beng Wafer', purchase_price: 2500, current_stock: 100 },
  { id: 'i3', outlet_id: 'outlet_1', unit_id: 'u3', name: 'Chocolate Topping', purchase_price: 50, current_stock: 2000 },
  { id: 'i4', outlet_id: 'outlet_1', unit_id: 'u5', name: 'Espresso Shot', purchase_price: 300, current_stock: 5000 },
  { id: 'i5', outlet_id: 'outlet_1', unit_id: 'u1', name: 'Cup 16oz', purchase_price: 1200, current_stock: 200 },
  { id: 'i6', outlet_id: 'outlet_1', unit_id: 'u1', name: 'Lid Cup', purchase_price: 500, current_stock: 200 },
  { id: 'i7', outlet_id: 'outlet_1', unit_id: 'u1', name: 'Straw', purchase_price: 200, current_stock: 500 },
  { id: 'i8', outlet_id: 'outlet_1', unit_id: 'u3', name: 'Cheddar Cheese', purchase_price: 180, current_stock: 3000 },
  { id: 'i9', outlet_id: 'outlet_1', unit_id: 'u1', name: 'Beef Patty Premium', purchase_price: 18500, current_stock: 50 },
  { id: 'i10', outlet_id: 'outlet_1', unit_id: 'u1', name: 'Burger Bun', purchase_price: 4500, current_stock: 80 },
  { id: 'i11', outlet_id: 'outlet_1', unit_id: 'u5', name: 'Caramel Syrup', purchase_price: 250, current_stock: 1000 },
]

const unitConversions: DBUnitConversion[] = [
  { id: 'uc1', outlet_id: 'outlet_1', from_unit_id: 'u3', to_unit_id: 'u2', conversion_factor: 0.001, is_exact: true },
  { id: 'uc2', outlet_id: 'outlet_1', from_unit_id: 'u2', to_unit_id: 'u3', conversion_factor: 1000, is_exact: true },
  { id: 'uc3', outlet_id: 'outlet_1', from_unit_id: 'u5', to_unit_id: 'u4', conversion_factor: 0.001, is_exact: true },
  { id: 'uc4', outlet_id: 'outlet_1', from_unit_id: 'u4', to_unit_id: 'u5', conversion_factor: 1000, is_exact: true },
]

const recipeHeaders: DBRecipeHeader[] = [
  { id: 'rh1', outlet_id: 'outlet_1', product_id: 'p1', version: 1, status: 'active', total_hpp: 4200 },
  { id: 'rh2', outlet_id: 'outlet_1', product_id: 'p2', version: 1, status: 'active', total_hpp: 25400 },
  { id: 'rh3', outlet_id: 'outlet_1', product_id: 'p3', version: 1, status: 'active', total_hpp: 11200 },
]

const recipeItems: DBRecipeItem[] = [
  { id: 'ri1', recipe_id: 'rh1', ingredient_id: 'i2', quantity: 1, unit_id: 'u1', unit_cost: 2500, total_cost: 2500, sort_order: 1 },
  { id: 'ri2', recipe_id: 'rh1', ingredient_id: 'i1', quantity: 1000, unit_id: 'u5', unit_cost: 1.2, total_cost: 1200, sort_order: 2 },
  { id: 'ri3', recipe_id: 'rh1', ingredient_id: 'i3', quantity: 1000, unit_id: 'u3', unit_cost: 0.5, total_cost: 500, sort_order: 3 },
  { id: 'ri4', recipe_id: 'rh2', ingredient_id: 'i9', quantity: 1, unit_id: 'u1', unit_cost: 18500, total_cost: 18500, sort_order: 1 },
  { id: 'ri5', recipe_id: 'rh2', ingredient_id: 'i10', quantity: 1, unit_id: 'u1', unit_cost: 4500, total_cost: 4500, sort_order: 2 },
  { id: 'ri6', recipe_id: 'rh2', ingredient_id: 'i8', quantity: 30, unit_id: 'u3', unit_cost: 1.8, total_cost: 54, sort_order: 3 },
  { id: 'ri7', recipe_id: 'rh3', ingredient_id: 'i4', quantity: 60, unit_id: 'u5', unit_cost: 3.0, total_cost: 180, sort_order: 1 },
  { id: 'ri8', recipe_id: 'rh3', ingredient_id: 'i1', quantity: 200, unit_id: 'u5', unit_cost: 1.2, total_cost: 240, sort_order: 2 },
  { id: 'ri9', recipe_id: 'rh3', ingredient_id: 'i11', quantity: 30, unit_id: 'u5', unit_cost: 2.5, total_cost: 75, sort_order: 3 },
]

const products: DBProduct[] = [
  { id: 'p1', outlet_id: 'outlet_1', name: 'Beng-Beng Ice', selling_price: 15000, hpp: 4200 },
  { id: 'p2', outlet_id: 'outlet_1', name: 'Premium Cheeseburger', selling_price: 75000, hpp: 25400 },
  { id: 'p3', outlet_id: 'outlet_1', name: 'Iced Caramel Macchiato', selling_price: 40000, hpp: 11200 },
]

const packagingItems: DBPackagingItem[] = [
  { id: 'pk1', outlet_id: 'outlet_1', unit_id: 'u1', name: 'Plastic Cup 16oz', purchase_price: 1200 },
  { id: 'pk2', outlet_id: 'outlet_1', unit_id: 'u1', name: 'Cup Lid', purchase_price: 500 },
  { id: 'pk3', outlet_id: 'outlet_1', unit_id: 'u1', name: 'Paper Bag Small', purchase_price: 800 },
]

const packagingCosts: DBPackagingCost[] = [
  { id: 'pc1', product_id: 'p1', packaging_item_id: 'pk1', quantity_per_product: 1, unit_cost_at_calculation: 1200, total_packaging_hpp: 1200, is_active: true },
  { id: 'pc2', product_id: 'p1', packaging_item_id: 'pk2', quantity_per_product: 1, unit_cost_at_calculation: 500, total_packaging_hpp: 500, is_active: true },
  { id: 'pc3', product_id: 'p3', packaging_item_id: 'pk1', quantity_per_product: 1, unit_cost_at_calculation: 1200, total_packaging_hpp: 1200, is_active: true },
  { id: 'pc4', product_id: 'p3', packaging_item_id: 'pk2', quantity_per_product: 1, unit_cost_at_calculation: 500, total_packaging_hpp: 500, is_active: true },
  { id: 'pc5', product_id: 'p2', packaging_item_id: 'pk3', quantity_per_product: 1, unit_cost_at_calculation: 800, total_packaging_hpp: 800, is_active: true },
]

const semiFinishedProducts: DBSemiFinished[] = [
  { id: 'sf1', outlet_id: 'outlet_1', unit_id: 'u5', name: 'Milk Base Mix', current_stock: 5000, standard_yield: 95.00 },
  { id: 'sf2', outlet_id: 'outlet_1', unit_id: 'u1', name: 'Prepared Burger Patty', current_stock: 30, standard_yield: 85.00 },
]

const semiFinishedRecipeItems: DBSemiFinishedRecipeItem[] = [
  { id: 'sfr1', outlet_id: 'outlet_1', semi_finished_id: 'sf1', ingredient_id: 'i1', sub_semi_finished_id: null, quantity: 1000, unit_id: 'u5', unit_cost: 1.2, sort_order: 1 },
  { id: 'sfr2', outlet_id: 'outlet_1', semi_finished_id: 'sf1', ingredient_id: 'i11', sub_semi_finished_id: null, quantity: 50, unit_id: 'u5', unit_cost: 2.5, sort_order: 2 },
]

// ─── Repository Functions ───────────────────────────────────────────

export class RecipeRepository {
  async getActiveRecipe(productId: string): Promise<DBRecipeHeader | null> {
    const recipe = recipeHeaders.find(
      (r) => r.product_id === productId && r.status === 'active',
    )
    return recipe || null
  }

  async getRecipeByVersion(recipeId: string): Promise<DBRecipeHeader | null> {
    const recipe = recipeHeaders.find(
      (r) => r.id === recipeId,
    )
    return recipe || null
  }

  async getRecipeItems(recipeId: string): Promise<DBRecipeItem[]> {
    return recipeItems.filter((item) => item.recipe_id === recipeId)
  }

  async getIngredient(ingredientId: string): Promise<DBIngredient | null> {
    return ingredients.find((i) => i.id === ingredientId) || null
  }

  async getUnit(unitId: string): Promise<DBUnit | null> {
    return units.find((u) => u.id === unitId) || null
  }

  async getUnitConversion(
    outletId: string,
    fromUnitId: string,
    toUnitId: string,
  ): Promise<DBUnitConversion | null> {
    return (
      unitConversions.find(
        (uc) =>
          uc.outlet_id === outletId &&
          uc.from_unit_id === fromUnitId &&
          uc.to_unit_id === toUnitId,
      ) || null
    )
  }

  async getProduct(productId: string): Promise<DBProduct | null> {
    return products.find((p) => p.id === productId) || null
  }

  async getActivePackagingCosts(productId: string): Promise<DBPackagingCost[]> {
    return packagingCosts.filter((pc) => pc.product_id === productId && pc.is_active)
  }

  async getPackagingItem(packagingItemId: string): Promise<DBPackagingItem | null> {
    return packagingItems.find((p) => p.id === packagingItemId) || null
  }

  async getSemiFinished(semiFinishedId: string): Promise<DBSemiFinished | null> {
    return semiFinishedProducts.find((sf) => sf.id === semiFinishedId) || null
  }

  async getSemiFinishedRecipeItems(
    semiFinishedId: string,
  ): Promise<DBSemiFinishedRecipeItem[]> {
    return semiFinishedRecipeItems.filter(
      (sfr) => sfr.semi_finished_id === semiFinishedId,
    )
  }

  // ── Future: Supabase queries ──────────────────────────────────────────
  // When migrating to Supabase, replace the mock arrays above with:
  //
  // async getActiveRecipe(productId: string): Promise<DBRecipeHeader | null> {
  //   const { data } = await supabase
  //     .from('recipe_headers')
  //     .select('*')
  //     .eq('product_id', productId)
  //     .eq('status', 'active')
  //     .order('version', { ascending: false })
  //     .limit(1)
  //     .single()
  //   return data
  // }
  //
  // async getRecipeItems(recipeId: string): Promise<DBRecipeItem[]> {
  //   const { data } = await supabase
  //     .from('recipe_items')
  //     .select('*')
  //     .eq('recipe_id', recipeId)
  //     .order('sort_order')
  //   return data || []
  // }
}