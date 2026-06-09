import { useState, useEffect, useCallback } from 'react'
import { InventoryRuntimeEngine, getInventoryEngine } from '../../services/inventory/engine'
import type { StockMutationInput, ConsumeInput, WasteInput, OpnameInput, InventoryValidationError } from '../../services/inventory/types'
import type { InventoryMovementRow } from '../../repositories/supabase/inventoryRepository'

export function useInventoryEngine() {
  const engine = getInventoryEngine()

  const mutate = useCallback(async (input: StockMutationInput) => {
    return engine.mutate(input)
  }, [engine])

  const consume = useCallback(async (input: ConsumeInput) => {
    return engine.consume(input)
  }, [engine])

  const recordWaste = useCallback(async (input: WasteInput) => {
    return engine.recordWaste(input)
  }, [engine])

  const processOpname = useCallback(async (input: OpnameInput) => {
    return engine.processOpname(input)
  }, [engine])

  const getMovementHistory = useCallback(async (ingredientId: string, options?: { limit?: number; offset?: number }) => {
    return engine.getMovementHistory(ingredientId, options)
  }, [engine])

  const getStockSummary = useCallback(async (outletId: string) => {
    return engine.getStockSummary(outletId)
  }, [engine])

  return { mutate, consume, recordWaste, processOpname, getMovementHistory, getStockSummary }
}

export function useMovementHistory(ingredientId: string | null) {
  const [movements, setMovements] = useState<InventoryMovementRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ingredientId) return
    setIsLoading(true)
    getInventoryEngine()
      .getMovementHistory(ingredientId)
      .then(setMovements)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [ingredientId])

  return { movements, isLoading, error }
}

export function useStockSummary(outletId: string | null) {
  const [summary, setSummary] = useState<{
    totalIngredients: number
    totalStockValue: number
    lowStockCount: number
    outOfStockCount: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!outletId) return
    setIsLoading(true)
    getInventoryEngine()
      .getStockSummary(outletId)
      .then(setSummary)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [outletId])

  return { summary, isLoading }
}