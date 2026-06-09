// ============================================================================
// POS Transaction Engine — Type Definitions
// ============================================================================

// ─── Input Types ────────────────────────────────────────────────────

export interface POSLineItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discountAmount: number
  notes?: string
}

export interface CreateSaleInput {
  outletId: string
  cashierId: string
  idempotencyKey: string
  customerId?: string
  items: POSLineItem[]
  orderType: 'dine_in' | 'take_away' | 'delivery'
  paymentMethod: 'cash' | 'qris' | 'debit' | 'credit' | 'split'
  discountAmount: number
  taxRate: number
  serviceChargeRate: number
  tableNumber?: string
  notes?: string
}

export interface VoidSaleInput {
  saleId: string
  outletId: string
  userId: string
  reason: string
}

export interface RefundItem {
  saleItemId: string
  productId: string
  quantity: number
}

export interface RefundSaleInput {
  saleId: string
  outletId: string
  userId: string
  items: RefundItem[] // empty = full refund
  reason: string
  restockInventory: boolean
}

// ─── Output Types ───────────────────────────────────────────────────

export interface POSResult {
  success: boolean
  saleId: string | null
  saleNumber: string | null
  transactionId: string
  timestamp: string
  hppSnapshotId: string | null
  profitSnapshotId: string | null
  movementIds: string[]
  auditIds: string[]
  warnings: POSWarning[]
  error?: string
  idempotent?: boolean // CR-4: true if was a duplicate of an existing tx
}

export interface POSWarning {
  type: 'out_of_stock' | 'low_stock' | 'price_mismatch' | 'customer_not_found'
    | 'payment_mismatch' | 'partial_refund' | 'void_success'
  message: string
  severity: 'info' | 'warning' | 'error'
}

// ─── Sale Record (in-memory) ────────────────────────────────────────

export interface SaleRecord {
  id: string
  saleNumber: string
  outletId: string
  cashierId: string
  customerId: string | null
  orderType: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded'
  subtotal: number
  taxAmount: number
  discountAmount: number
  serviceCharge: number
  totalAmount: number
  paymentMethod: string
  tableNumber: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface SaleItemRecord {
  id: string
  saleId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discountAmount: number
  totalPrice: number
  hppAtSale: number
  notes: string | null
  createdAt: string
}

// ─── Inventory Types ────────────────────────────────────────────────

export interface StockValidationResult {
  productId: string
  productName: string
  isAvailable: boolean
  requested: number
  available: number
  reason?: string
}

export interface ConsumptionRecord {
  ingredientId: string
  ingredientName: string
  quantity: number
  unitSymbol: string
  movementType: string
}

// ─── Dashboard Metrics Update ───────────────────────────────────────

export interface MetricsDelta {
  revenue: number
  profit: number
  hpp: number
  transactions: number
  itemsSold: Record<string, number> // productId → quantity
}

// ─── Offline Queue Types (HR-5) ─────────────────────────────────────

export interface QueuedTransaction {
  id: string
  status: 'pending' | 'synced' | 'failed'
  createdAt: string
  syncedAt?: string
  error?: string
  retryCount: number
  payload: CreateSaleInput
  result?: POSResult
}