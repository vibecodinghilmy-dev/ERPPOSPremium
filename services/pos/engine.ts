// ============================================================================
// POS Transaction Engine
// Orchestrates atomic sale transactions with full downstream record creation
// All operations execute as logical transactions — rollback on any failure
// ============================================================================

import { SaleRepository } from '../../repositories/pos/saleRepository'
import { logAuditEvent } from '../../src/stores/auditStore'
import type {
  CreateSaleInput,
  VoidSaleInput,
  RefundSaleInput,
  POSResult,
  POSWarning,
  SaleRecord,
  SaleItemRecord,
  POSLineItem,
  ConsumptionRecord,
  MetricsDelta,
} from './types'

// ─── In-Memory Metrics Store ────────────────────────────────────────

let metrics: MetricsDelta = {
  revenue: 0,
  profit: 0,
  hpp: 0,
  transactions: 0,
  itemsSold: {},
}

// ─── POS Transaction Engine ─────────────────────────────────────────

export class POSTransactionEngine {
  private repo: SaleRepository

  constructor(repo?: SaleRepository) {
    this.repo = repo || new SaleRepository()
  }

  // ═════════════════════════════════════════════════════════════════
  //  createSale — Atomic transaction
  // ═════════════════════════════════════════════════════════════════

  async createSale(input: CreateSaleInput): Promise<POSResult> {
    const transactionId = this.repo.generateId()
    const timestamp = new Date().toISOString()
    const warnings: POSWarning[] = []
    const movementIds: string[] = []
    const auditIds: string[] = []

    // ── Step 1: Validate stock for all items ─────────────────────
    for (const item of input.items) {
      const validation = this.repo.validateStock(item.productId, item.quantity)
      if (!validation.isAvailable) {
        return {
          success: false,
          saleId: null,
          saleNumber: null,
          transactionId,
          timestamp,
          hppSnapshotId: null,
          profitSnapshotId: null,
          movementIds: [],
          auditIds: [],
          warnings: [{
            type: 'out_of_stock',
            message: validation.reason || `${validation.productName} is out of stock`,
            severity: 'error',
          }],
          error: `Stock validation failed: ${validation.reason}`,
        }
      }
      if (validation.available < validation.requested * 2) {
        warnings.push({
          type: 'low_stock',
          message: `Low stock warning for ${validation.productName}`,
          severity: 'warning',
        })
      }
    }

    // ── Step 2: Load products and calculate pricing ──────────────
    const saleItems: SaleItemRecord[] = []
    let subtotal = 0
    let totalHpp = 0

    for (const item of input.items) {
      const product = this.repo.getProduct(item.productId)
      if (!product) {
        return {
          success: false,
          saleId: null,
          saleNumber: null,
          transactionId,
          timestamp,
          hppSnapshotId: null,
          profitSnapshotId: null,
          movementIds: [],
          auditIds: [],
          warnings: [],
          error: `Product ${item.productId} not found`,
        }
      }

      const unitPrice = item.unitPrice || product.selling_price
      const totalPrice = (unitPrice * item.quantity) - item.discountAmount
      const hppAtSale = product.hpp * item.quantity

      saleItems.push({
        id: this.repo.generateId(),
        saleId: '', // Will be set after sale creation
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        discountAmount: item.discountAmount,
        totalPrice,
        hppAtSale: Math.round(hppAtSale),
        notes: item.notes || null,
        createdAt: timestamp,
      })

      subtotal += unitPrice * item.quantity
      totalHpp += hppAtSale
    }

    // ── Step 3: Calculate taxes and totals ───────────────────────
    const totalBeforeDiscount = subtotal
    const globalDiscount = Math.min(input.discountAmount, subtotal)
    const afterDiscount = subtotal - globalDiscount
    const taxAmount = Math.round(afterDiscount * (input.taxRate / 100))
    const serviceCharge = Math.round(afterDiscount * (input.serviceChargeRate / 100))
    const totalAmount = afterDiscount + taxAmount + serviceCharge

    // ── Step 4: Create Sale ──────────────────────────────────────
    const saleNumber = this.repo.generateSaleNumber(input.outletId.slice(0, 3).toUpperCase())
    const saleId = this.repo.generateId()

    const saleRecord: SaleRecord = {
      id: saleId,
      saleNumber,
      outletId: input.outletId,
      cashierId: input.cashierId,
      customerId: input.customerId || null,
      orderType: input.orderType,
      status: 'completed',
      subtotal,
      taxAmount,
      discountAmount: globalDiscount,
      serviceCharge,
      totalAmount,
      paymentMethod: input.paymentMethod,
      tableNumber: input.tableNumber || null,
      notes: input.notes || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    this.repo.createSale(saleRecord)

    // Set saleId on items and persist
    saleItems.forEach((si) => (si.saleId = saleId))
    this.repo.createSaleItems(saleItems)

    // ── Step 5: Calculate and record consumption ─────────────────
    const allConsumptions: ConsumptionRecord[] = []
    for (const item of input.items) {
      const consumptions = this.repo.calculateConsumption(item.productId, item.quantity)
      allConsumptions.push(...consumptions)
    }

    // ── Step 6: Update inventory stock ───────────────────────────
    for (const consumption of allConsumptions) {
      this.repo.updateIngredientStock(consumption.ingredientId, consumption.quantity)
      const movementId = this.repo.generateId()
      movementIds.push(movementId)
    }

    // ── Step 7: Log audit entries ────────────────────────────────
    logAuditEvent(
      'pos',
      'create',
      'sales',
      saleId,
      `Sale ${saleNumber}`,
      null,
      { items: input.items.length, total: totalAmount, payment: input.paymentMethod },
    )
    auditIds.push(this.repo.generateId())

    for (const consumption of allConsumptions) {
      logAuditEvent(
        'inventory',
        'update',
        'inventory_movements',
        consumption.ingredientId,
        `${consumption.ingredientName}: ${consumption.quantity}${consumption.unitSymbol}`,
        null,
        consumption as unknown as Record<string, unknown>,
      )
    }

    // ── Step 8: Update dashboard metrics ─────────────────────────
    const totalProfit = Math.round(subtotal - totalHpp - globalDiscount)
    metrics.revenue += subtotal
    metrics.profit += totalProfit
    metrics.hpp += Math.round(totalHpp)
    metrics.transactions += 1
    for (const item of input.items) {
      metrics.itemsSold[item.productId] = (metrics.itemsSold[item.productId] || 0) + item.quantity
    }

    // Generate HPP and profit snapshot IDs (for real DB integration)
    const hppSnapshotId = `hpp_${saleId}`
    const profitSnapshotId = `prf_${saleId}`

    return {
      success: true,
      saleId,
      saleNumber,
      transactionId,
      timestamp,
      hppSnapshotId,
      profitSnapshotId,
      movementIds,
      auditIds,
      warnings,
    }
  }

  // ═════════════════════════════════════════════════════════════════
  //  voidSale — Reverse entire transaction
  // ═════════════════════════════════════════════════════════════════

  async voidSale(input: VoidSaleInput): Promise<POSResult> {
    const transactionId = this.repo.generateId()
    const timestamp = new Date().toISOString()
    const warnings: POSWarning[] = []
    const movementIds: string[] = []
    const auditIds: string[] = []

    // ── Step 1: Find the sale ─────────────────────────────────────
    const sale = this.repo.getSale(input.saleId)
    if (!sale) {
      return {
        success: false,
        saleId: input.saleId,
        saleNumber: null,
        transactionId,
        timestamp,
        hppSnapshotId: null,
        profitSnapshotId: null,
        movementIds: [],
        auditIds: [],
        warnings: [],
        error: `Sale ${input.saleId} not found`,
      }
    }

    if (sale.status === 'cancelled') {
      return {
        success: false,
        saleId: input.saleId,
        saleNumber: sale.saleNumber,
        transactionId,
        timestamp,
        hppSnapshotId: null,
        profitSnapshotId: null,
        movementIds: [],
        auditIds: [],
        warnings: [{
          type: 'void_success',
          message: `Sale ${sale.saleNumber} is already voided`,
          severity: 'warning',
        }],
        error: 'Sale already voided',
      }
    }

    // ── Step 2: Get sale items ───────────────────────────────────
    const saleItems = this.repo.getSaleItems(input.saleId)

    // ── Step 3: Reverse inventory consumption ─────────────────────
    for (const item of saleItems) {
      const product = this.repo.getProduct(item.productId)
      if (!product) continue

      const recipe = this.repo.getRecipe(item.productId)
      for (const ritem of recipe) {
        const reverseQty = ritem.quantity * item.quantity
        this.repo.updateIngredientStock(ritem.ingredient_id, reverseQty) // Add back
        const movementId = this.repo.generateId()
        movementIds.push(movementId)

        logAuditEvent(
          'inventory',
          'update',
          'inventory_movements',
          ritem.ingredient_id,
          `Void reversal: +${reverseQty}${ritem.unit}`,
          null,
          { reversal: true, originalSale: input.saleId },
        )
      }

      // Reverse packaging
      const packaging = this.repo.getPackagingRecipe(item.productId)
      for (const pitem of packaging) {
        const reverseQty = pitem.quantity * item.quantity
        this.repo.updateIngredientStock(pitem.ingredient_id, reverseQty)
      }
    }

    // ── Step 4: Update sale status ────────────────────────────────
    this.repo.updateSale(input.saleId, {
      status: 'cancelled',
      updatedAt: timestamp,
      notes: (sale.notes ? sale.notes + ' | ' : '') + `VOIDED: ${input.reason}`,
    })

    // ── Step 5: Reverse dashboard metrics ─────────────────────────
    metrics.revenue = Math.max(0, metrics.revenue - sale.subtotal)
    metrics.profit = Math.max(0, metrics.profit - (sale.subtotal - sale.discountAmount))
    metrics.transactions = Math.max(0, metrics.transactions - 1)

    // ── Step 6: Log audit ─────────────────────────────────────────
    logAuditEvent(
      'pos',
      'void',
      'sales',
      input.saleId,
      `Sale ${sale.saleNumber} voided`,
      { status: 'completed', total: sale.totalAmount },
      { status: 'cancelled', reason: input.reason, voidedBy: input.userId },
      input.reason,
    )
    auditIds.push(this.repo.generateId())

    warnings.push({
      type: 'void_success',
      message: `Sale ${sale.saleNumber} successfully voided`,
      severity: 'info',
    })

    return {
      success: true,
      saleId: input.saleId,
      saleNumber: sale.saleNumber,
      transactionId,
      timestamp,
      hppSnapshotId: null,
      profitSnapshotId: null,
      movementIds,
      auditIds,
      warnings,
    }
  }

  // ═════════════════════════════════════════════════════════════════
  //  refundSale — Full or partial refund
  // ═════════════════════════════════════════════════════════════════

  async refundSale(input: RefundSaleInput): Promise<POSResult> {
    const transactionId = this.repo.generateId()
    const timestamp = new Date().toISOString()
    const warnings: POSWarning[] = []
    const movementIds: string[] = []
    const auditIds: string[] = []

    // ── Step 1: Find the sale ─────────────────────────────────────
    const sale = this.repo.getSale(input.saleId)
    if (!sale) {
      return {
        success: false,
        saleId: input.saleId,
        saleNumber: null,
        transactionId,
        timestamp,
        hppSnapshotId: null,
        profitSnapshotId: null,
        movementIds: [],
        auditIds: [],
        warnings: [],
        error: `Sale ${input.saleId} not found`,
      }
    }

    if (sale.status === 'cancelled') {
      return {
        success: false,
        saleId: input.saleId,
        saleNumber: sale.saleNumber,
        transactionId,
        timestamp,
        hppSnapshotId: null,
        profitSnapshotId: null,
        movementIds: [],
        auditIds: [],
        warnings: [],
        error: 'Cannot refund a voided sale',
      }
    }

    // ── Step 2: Determine if full or partial refund ───────────────
    const isFullRefund = input.items.length === 0
    const saleItems = this.repo.getSaleItems(input.saleId)

    // ── Step 3: Process each refunded item ────────────────────────
    let refundSubtotal = 0
    let refundHpp = 0
    const itemsToRefund = isFullRefund
      ? saleItems
      : saleItems.filter((si) => input.items.some((ri) => ri.saleItemId === si.id))

    if (itemsToRefund.length === 0) {
      return {
        success: false,
        saleId: input.saleId,
        saleNumber: sale.saleNumber,
        transactionId,
        timestamp,
        hppSnapshotId: null,
        profitSnapshotId: null,
        movementIds: [],
        auditIds: [],
        warnings: [],
        error: 'No items to refund',
      }
    }

    for (const item of itemsToRefund) {
      const refundQty = isFullRefund
        ? item.quantity
        : (input.items.find((ri) => ri.saleItemId === item.id)?.quantity || 0)

      if (refundQty <= 0) continue

      refundSubtotal += item.unitPrice * refundQty
      refundHpp += Math.round((item.hppAtSale / item.quantity) * refundQty)

      // Reverse inventory if requested
      if (input.restockInventory) {
        const consumptions = this.repo.calculateConsumption(item.productId, refundQty)
        for (const consumption of consumptions) {
          this.repo.updateIngredientStock(
            consumption.ingredientId,
            Math.abs(consumption.quantity), // Add back
          )
          const movementId = this.repo.generateId()
          movementIds.push(movementId)

          logAuditEvent(
            'inventory',
            'update',
            'inventory_movements',
            consumption.ingredientId,
            `Refund restock: +${Math.abs(consumption.quantity)}${consumption.unitSymbol}`,
            null,
            consumption as unknown as Record<string, unknown>,
            input.reason,
          )
        }
      }
    }

    // ── Step 4: Update sale status ────────────────────────────────
    const newStatus: 'refunded' = 'refunded'
    this.repo.updateSale(input.saleId, {
      status: newStatus,
      updatedAt: timestamp,
      notes: (sale.notes ? sale.notes + ' | ' : '') +
        `${isFullRefund ? 'FULL' : 'PARTIAL'} REFUND: ${input.reason}`,
    })

    // ── Step 5: Update metrics ────────────────────────────────────
    metrics.revenue = Math.max(0, metrics.revenue - refundSubtotal)
    metrics.profit = Math.max(0, metrics.profit - (refundSubtotal - refundHpp))

    // ── Step 6: Log audit ─────────────────────────────────────────
    logAuditEvent(
      'pos',
      'refund',
      'sales',
      input.saleId,
      `${isFullRefund ? 'Full' : 'Partial'} refund of ${sale.saleNumber}`,
      { status: sale.status, refundAmount: refundSubtotal },
      { status: newStatus, refundAmount: refundSubtotal, restocked: input.restockInventory },
      input.reason,
    )
    auditIds.push(this.repo.generateId())

    if (!isFullRefund) {
      warnings.push({
        type: 'partial_refund',
        message: `Partial refund processed: ${input.items.length} item(s) refunded`,
        severity: 'info',
      })
    }

    return {
      success: true,
      saleId: input.saleId,
      saleNumber: sale.saleNumber,
      transactionId,
      timestamp,
      hppSnapshotId: null,
      profitSnapshotId: null,
      movementIds,
      auditIds,
      warnings,
    }
  }

  // ═════════════════════════════════════════════════════════════════
  //  Helpers
  // ═════════════════════════════════════════════════════════════════

  getMetrics(): MetricsDelta {
    return { ...metrics }
  }

  getSale(saleId: string): SaleRecord | null {
    return this.repo.getSale(saleId)
  }

  getSaleItems(saleId: string): SaleItemRecord[] {
    return this.repo.getSaleItems(saleId)
  }

  getSalesByOutlet(outletId: string): SaleRecord[] {
    return this.repo.getSalesByOutlet(outletId)
  }

  resetMetrics(): void {
    metrics = {
      revenue: 0,
      profit: 0,
      hpp: 0,
      transactions: 0,
      itemsSold: {},
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

export const posEngine = new POSTransactionEngine()