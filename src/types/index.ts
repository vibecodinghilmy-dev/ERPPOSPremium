export * from './database'

export interface CartItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  discount_amount: number
  total_price: number
  hpp_at_sale: number
  notes?: string
  image_url?: string
}

export interface DashboardMetrics {
  revenue_today: number
  revenue_yesterday: number
  revenue_change_pct: number
  profit_today: number
  profit_change_pct: number
  hpp_today: number
  total_transactions: number
  transaction_change: number
  gross_profit_month: number
  avg_order_value: number
  food_cost_pct: number
  top_products: TopProduct[]
  low_stock_items: LowStockItem[]
  waste_cost_today: number
}

export interface TopProduct {
  product_id: string
  product_name: string
  total_sold: number
  total_revenue: number
}

export interface LowStockItem {
  ingredient_id: string
  ingredient_name: string
  current_stock: number
  min_stock: number
  unit_symbol: string
  category_name: string
  status: 'critical' | 'low'
}

export interface POSOrder {
  items: CartItem[]
  order_type: 'dine_in' | 'take_away' | 'delivery'
  customer_id?: string
  table_number?: string
  discount_amount: number
  tax_rate: number
  service_charge_rate: number
  payment_method: 'cash' | 'qris' | 'debit' | 'credit'
  notes?: string
}

export interface RecipeWithItems {
  id: string
  product_id: string
  product_name: string
  version: number
  status: 'draft' | 'active' | 'archived'
  total_hpp: number
  items: RecipeItemDetail[]
}

export interface RecipeItemDetail {
  id: string
  ingredient_id: string
  ingredient_name: string
  quantity: number
  unit_symbol: string
  unit_cost: number
  total_cost: number
}

export interface SaleWithItems {
  id: string
  sale_number: string
  order_type: string
  status: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  payment_method: string
  created_at: string
  customer_name?: string
  items: SaleItemDetail[]
}

export interface SaleItemDetail {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  hpp_at_sale: number
}

export interface PurchaseWithItems {
  id: string
  po_number: string
  supplier_name: string
  status: string
  order_date: string
  expected_date: string | null
  total_amount: number
  items: PurchaseItemDetail[]
}

export interface PurchaseItemDetail {
  ingredient_id: string
  ingredient_name: string
  quantity: number
  unit_symbol: string
  unit_price: number
  total_price: number
}

export interface FinancialReport {
  period: string
  total_revenue: number
  total_cogs: number
  gross_profit: number
  total_opex: number
  net_profit: number
  gross_margin_pct: number
  net_margin_pct: number
  food_cost_pct: number
}

export interface StockOpnameItem {
  ingredient_id: string
  ingredient_name: string
  system_stock: number
  physical_stock: number
  difference: number
  unit_cost: number
  difference_value: number
}

export type UserRole = 'owner' | 'manager' | 'cashier' | 'warehouse' | 'accounting' | 'admin'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: UserRole
  outlet_id?: string
  outlet_name?: string
  permissions: string[]
}
