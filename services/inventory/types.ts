// ============================================================================
// Inventory Runtime Engine — Type Definitions
// ============================================================================

export type MovementType =
  | 'purchase' | 'sale' | 'production' | 'consumption' | 'waste'
  | 'adjustment' | 'transfer_out' | 'transfer_in' | 'opname'
  | 'packaging_consumption' | 'production_output' | 'return'

export type MovementStatus = 'pending' | 'approved' | 'rejected' | 'completed'

export interface StockMutationInput {
  outletId: string
  ingredientId: string
  quantity: number
  movementType: string
  unitCost?: number
  referenceId?: string
  referenceType?: string
  notes?: string
  createdBy?: string
}

export interface ConsumeInput {
  outletId: string
  productId: string
  productName: string
  quantity: number
  recipeVersion?: number
  createdBy?: string
}

export interface TransferInput {
  outletId: string
  sourceOutletId: string
  destinationOutletId: string
  items: TransferItem[]
  requestedBy?: string
  notes?: string
}

export interface TransferItem {
  ingredientId: string
  ingredientName: string
  quantity: number
  unitCost: number
}

export interface WasteInput {
  outletId: string
  ingredientId: string
  ingredientName: string
  quantity: number
  unitCost: number
  reason: string
  createdBy?: string
}

export interface OpnameInput {
  outletId: string
  sessionId: string
  items: OpnameCountItem[]
  createdBy?: string
}

export interface OpnameCountItem {
  ingredientId: string
  ingredientName: string
  systemStock: number
  physicalStock: number
  unitCost: number
}

export interface AdjustInput {
  outletId: string
  ingredientId: string
  newStock: number
  reason: string
  createdBy?: string
}

export interface StockMovement {
  id: string
  outletId: string
  ingredientId: string
  ingredientName: string
  movementType: string
  quantity: number
  unitCost: number
  totalCost: number
  stockBefore: number
  stockAfter: number
  referenceId: string | null
  referenceType: string | null
  notes: string | null
  createdBy: string | null
  status: string
  createdAt: string
}

export interface InventoryValidationError {
  type: 'negative_stock' | 'duplicate_movement' | 'cross_outlet' | 'invalid_conversion'
    | 'invalid_transfer' | 'invalid_quantity' | 'ingredient_not_found'
    | 'insufficient_stock' | 'opname_mismatch'
  message: string
  severity: 'error' | 'warning'
}

export interface IngredientSnapshot {
  ingredientId: string
  ingredientName: string
  currentStock: number
  minStock: number
  unitCost: number
  lastMovementAt: string | null
  isLowStock: boolean
  isOutOfStock: boolean
}

export type TransferStatus = 'draft' | 'requested' | 'approved' | 'in_transit' | 'received' | 'cancelled'

export interface TransferRecord {
  id: string
  transferNumber: string
  sourceOutletId: string
  destinationOutletId: string
  status: TransferStatus
  totalItems: number
  totalEstimatedValue: number
  notes: string | null
  requestedBy: string | null
  approvedBy: string | null
  shippedBy: string | null
  receivedBy: string | null
  shippedAt: string | null
  receivedAt: string | null
  createdAt: string
  updatedAt: string
}