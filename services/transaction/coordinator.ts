// ============================================================================
// ProStream ERP — Database Transaction Coordinator (RPC Version)
// All critical operations now use PostgreSQL RPC functions for atomicity
// CR-1: create_sale_transaction() RPC with BEGIN/COMMIT/ROLLBACK
// CR-2: atomic_adjust_stock() for race-condition-free stock updates
// CR-4: idempotency_key for duplicate prevention
// ============================================================================

import { supabase } from '../../src/lib/supabase'
import { getInventoryEngine } from '../inventory/engine'
import { profitEngine } from '../profit/engine'
import type { POSResult, POSWarning } from '../pos/types'

export class TransactionCoordinator {
  /**
   * Execute a COMPLETE POS sale in a single database transaction.
   * Uses PostgreSQL RPC function create_sale_transaction() which handles:
   * 1. Idempotency check (CR-4)
   * 2. BEGIN transaction
   * 3. Create Sale
   * 4. Create Sale Items
   * 5. Consume Inventory (via atomic_adjust_stock — CR-2)
   * 6. Create HPP Snapshots
   * 7. Create Profit Snapshots
   * 8. Create Audit Log
   * 9. COMMIT (automatic in function)
   * 10. ROLLBACK on any error (automatic via EXCEPTION block)
   */
  async executeSale(input: {
    outletId: string
    userId: string
    idempotencyKey: string
    customerId?: string
    items: Array<{
      productId: string
      productName: string
      quantity: number
      unitPrice: number
      discountAmount: number
      hppAtSale: number
    }>
    orderType: string
    paymentMethod: string
    discountAmount: number
    taxRate: number
    serviceChargeRate: number
    tableNumber?: string
    notes?: string
  }): Promise<POSResult> {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    try {
      // Convert items to Postgres-compatible JSON array
      const items = input.items.map((item) => ({
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_amount: item.discountAmount,
        hpp_at_sale: item.hppAtSale,
      }))

      // Call the RPC function — single database transaction
      const { data, error } = await supabase.rpc('create_sale_transaction', {
        p_outlet_id: input.outletId,
        p_user_id: input.userId,
        p_idempotency_key: input.idempotencyKey,
        p_customer_id: input.customerId || null,
        p_order_type: input.orderType,
        p_payment_method: input.paymentMethod,
        p_discount_amount: input.discountAmount,
        p_tax_rate: input.taxRate,
        p_service_charge_rate: input.serviceChargeRate,
        p_table_number: input.tableNumber || null,
        p_notes: input.notes || null,
        p_items: JSON.stringify(items),
      })

      if (error) {
        throw new Error(`RPC call failed: ${error.message}`)
      }

      const result = data as any

      if (!result.success) {
        return {
          success: false,
          saleId: null,
          saleNumber: null,
          transactionId,
          timestamp: new Date().toISOString(),
          hppSnapshotId: null,
          profitSnapshotId: null,
          movementIds: [],
          auditIds: [],
          warnings: [{ type: 'void_success', message: result.error || 'Transaction failed', severity: 'error' }],
          error: result.error,
        }
      }

      // Parse warnings from JSONB
      const warnings: POSWarning[] = (result.warnings || [])
        .filter((w: any) => w.severity === 'warning')
        .map((w: any) => ({
          type: w.type || 'low_stock',
          message: w.message,
          severity: 'warning' as const,
        }))

      return {
        success: true,
        saleId: result.sale_id,
        saleNumber: result.sale_number,
        transactionId,
        timestamp: new Date().toISOString(),
        hppSnapshotId: result.hpp_snapshot_id || null,
        profitSnapshotId: result.profit_snapshot_id || null,
        movementIds: result.movement_ids || [],
        auditIds: result.audit_ids || [],
        warnings,
        idempotent: result.idempotent || false,
      }
    } catch (error: any) {
      return {
        success: false,
        saleId: null,
        saleNumber: null,
        transactionId,
        timestamp: new Date().toISOString(),
        hppSnapshotId: null,
        profitSnapshotId: null,
        movementIds: [],
        auditIds: [],
        warnings: [{ type: 'void_success', message: error.message, severity: 'error' }],
        error: error.message,
      }
    }
  }

  /**
   * Void a sale using the RPC function
   */
  async voidSale(input: {
    saleId: string
    outletId: string
    userId: string
    reason: string
  }): Promise<POSResult> {
    const transactionId = `void_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    try {
      // Use RPC for atomic void operation
      const { data, error } = await supabase.rpc('void_sale_transaction', {
        p_sale_id: input.saleId,
        p_outlet_id: input.outletId,
        p_user_id: input.userId,
        p_reason: input.reason,
      })

      if (error) throw new Error(`Void RPC failed: ${error.message}`)

      const result = data as any

      return {
        success: result.success,
        saleId: input.saleId,
        saleNumber: result.sale_number || null,
        transactionId,
        timestamp: new Date().toISOString(),
        hppSnapshotId: null,
        profitSnapshotId: null,
        movementIds: result.movement_ids || [],
        auditIds: result.audit_ids || [],
        warnings: result.success
          ? [{ type: 'void_success', message: `Sale ${result.sale_number} voided`, severity: 'info' }]
          : [{ type: 'void_success', message: result.error, severity: 'error' }],
        error: result.success ? undefined : result.error,
      }
    } catch (error: any) {
      return {
        success: false,
        saleId: input.saleId,
        saleNumber: null,
        transactionId,
        timestamp: new Date().toISOString(),
        hppSnapshotId: null,
        profitSnapshotId: null,
        movementIds: [],
        auditIds: [],
        warnings: [{ type: 'void_success', message: error.message, severity: 'error' }],
        error: error.message,
      }
    }
  }
}

export const transactionCoordinator = new TransactionCoordinator()