// ============================================================================
// POS Transaction Engine — React Hooks
// ============================================================================

import { useState, useCallback } from 'react'
import { posEngine } from '../../services/pos/engine'
import type {
  CreateSaleInput,
  VoidSaleInput,
  RefundSaleInput,
  POSResult,
  SaleRecord,
  SaleItemRecord,
  MetricsDelta,
} from '../../services/pos/types'

// ─── useCreateSale ──────────────────────────────────────────────────

interface UseCreateSaleState {
  result: POSResult | null
  isProcessing: boolean
  error: string | null
}

export function useCreateSale() {
  const [state, setState] = useState<UseCreateSaleState>({
    result: null,
    isProcessing: false,
    error: null,
  })

  const createSale = useCallback(async (input: CreateSaleInput) => {
    setState((prev) => ({ ...prev, isProcessing: true, error: null }))
    try {
      const result = await posEngine.createSale(input)
      setState({ result, isProcessing: false, error: result.success ? null : result.error || null })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed'
      setState({ result: null, isProcessing: false, error: message })
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState({ result: null, isProcessing: false, error: null })
  }, [])

  return { ...state, createSale, reset }
}

// ─── useVoidSale ────────────────────────────────────────────────────

interface UseVoidSaleState {
  result: POSResult | null
  isProcessing: boolean
  error: string | null
}

export function useVoidSale() {
  const [state, setState] = useState<UseVoidSaleState>({
    result: null,
    isProcessing: false,
    error: null,
  })

  const voidSale = useCallback(async (input: VoidSaleInput) => {
    setState((prev) => ({ ...prev, isProcessing: true, error: null }))
    try {
      const result = await posEngine.voidSale(input)
      setState({ result, isProcessing: false, error: result.success ? null : result.error || null })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Void failed'
      setState({ result: null, isProcessing: false, error: message })
      return null
    }
  }, [])

  return { ...state, voidSale }
}

// ─── useRefundSale ──────────────────────────────────────────────────

interface UseRefundSaleState {
  result: POSResult | null
  isProcessing: boolean
  error: string | null
}

export function useRefundSale() {
  const [state, setState] = useState<UseRefundSaleState>({
    result: null,
    isProcessing: false,
    error: null,
  })

  const refundSale = useCallback(async (input: RefundSaleInput) => {
    setState((prev) => ({ ...prev, isProcessing: true, error: null }))
    try {
      const result = await posEngine.refundSale(input)
      setState({ result, isProcessing: false, error: result.success ? null : result.error || null })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refund failed'
      setState({ result: null, isProcessing: false, error: message })
      return null
    }
  }, [])

  return { ...state, refundSale }
}

// ─── usePOSMetrics ──────────────────────────────────────────────────

export function usePOSMetrics() {
  const [metrics, setMetrics] = useState<MetricsDelta>(posEngine.getMetrics())

  const refresh = useCallback(() => {
    setMetrics(posEngine.getMetrics())
  }, [])

  const reset = useCallback(() => {
    posEngine.resetMetrics()
    setMetrics(posEngine.getMetrics())
  }, [])

  return { metrics, refresh, reset }
}

// ─── useSaleLookup ──────────────────────────────────────────────────

export function useSaleLookup() {
  const getSale = useCallback((saleId: string): SaleRecord | null => {
    return posEngine.getSale(saleId)
  }, [])

  const getSaleItems = useCallback((saleId: string): SaleItemRecord[] => {
    return posEngine.getSaleItems(saleId)
  }, [])

  const getSalesByOutlet = useCallback((outletId: string): SaleRecord[] => {
    return posEngine.getSalesByOutlet(outletId)
  }, [])

  return { getSale, getSaleItems, getSalesByOutlet }
}