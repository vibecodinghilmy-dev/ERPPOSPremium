// ============================================================================
// HPP Engine — React Hooks
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { hppService } from '../../services/hpp'
import type {
  HPPCalculationInput,
  HPPCalculationResult,
  HPPProductSnapshot,
  HPPChangeLog,
  HPPWarning,
  OverheadConfig,
} from '../../services/hpp/types'
import type { BatchSummary } from '../../services/hpp'

// ─── useHPPCalculation ──────────────────────────────────────────────

interface UseHPPCalculationState {
  result: HPPCalculationResult | null
  isLoading: boolean
  error: string | null
}

export function useHPPCalculation() {
  const [state, setState] = useState<UseHPPCalculationState>({
    result: null,
    isLoading: false,
    error: null,
  })

  const calculate = useCallback(async (input: HPPCalculationInput) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const result = await hppService.calculateProduct(input)
      setState({ result, isLoading: false, error: null })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Calculation failed'
      setState({ result: null, isLoading: false, error: message })
      return null
    }
  }, [])

  return { ...state, calculate }
}

// ─── useHPPBatch ───────────────────────────────────────────────────

interface UseHPPBatchState {
  results: Map<string, HPPCalculationResult>
  summary: BatchSummary | null
  isLoading: boolean
  error: string | null
}

export function useHPPBatch() {
  const [state, setState] = useState<UseHPPBatchState>({
    results: new Map(),
    summary: null,
    isLoading: false,
    error: null,
  })

  const calculateBatch = useCallback(async (
    outletId: string,
    productIds: string[],
    forceRecalculate = false,
  ) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const { results, summary } = await hppService.calculateBatch({
        outletId,
        productIds,
        forceRecalculate,
      })
      setState({ results, summary, isLoading: false, error: null })
      return { results, summary }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch calculation failed'
      setState((prev) => ({ ...prev, isLoading: false, error: message }))
      return null
    }
  }, [])

  return { ...state, calculateBatch }
}

// ─── useHPPWhatIf ───────────────────────────────────────────────────

interface UseHPPWhatIfState {
  baseline: HPPCalculationResult | null
  scenario: HPPCalculationResult | null
  hppDelta: number
  hppDeltaPercent: number
  marginDelta: number
  isLoading: boolean
  error: string | null
}

export function useHPPWhatIf() {
  const [state, setState] = useState<UseHPPWhatIfState>({
    baseline: null,
    scenario: null,
    hppDelta: 0,
    hppDeltaPercent: 0,
    marginDelta: 0,
    isLoading: false,
    error: null,
  })

  const analyze = useCallback(async (
    input: HPPCalculationInput,
    ingredientPriceChanges: Record<string, number>,
  ) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const result = await hppService.analyzeScenario(input, ingredientPriceChanges)
      setState({
        baseline: result.baseline,
        scenario: result.scenario,
        hppDelta: result.hppDelta,
        hppDeltaPercent: result.hppDeltaPercent,
        marginDelta: result.marginDelta,
        isLoading: false,
        error: null,
      })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scenario analysis failed'
      setState((prev) => ({ ...prev, isLoading: false, error: message }))
      return null
    }
  }, [])

  return { ...state, analyze }
}

// ─── useHPPSnapshots ────────────────────────────────────────────────

export function useHPPSnapshots(productId?: string) {
  const [snapshots, setSnapshots] = useState<HPPProductSnapshot[]>([])

  const refresh = useCallback(() => {
    const data = hppService.getSnapshots(productId)
    setSnapshots(data)
  }, [productId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { snapshots, refresh }
}

// ─── useHPPChangeLogs ───────────────────────────────────────────────

export function useHPPChangeLogs(productId?: string) {
  const [logs, setLogs] = useState<HPPChangeLog[]>([])

  const refresh = useCallback(() => {
    const data = hppService.getChangeLogs(productId)
    setLogs(data)
  }, [productId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { logs, refresh }
}

// ─── useHPPSummary ─────────────────────────────────────────────────

interface HPPSummary {
  totalIngredientCost: number
  totalPackagingCost: number
  totalOverheadCost: number
  totalHPP: number
  foodCostPercent: number | null
  grossMarginPercent: number | null
  warnings: HPPWarning[]
  productCount: number
}

export function useHPPSummary() {
  const [summary, setSummary] = useState<HPPSummary>({
    totalIngredientCost: 0,
    totalPackagingCost: 0,
    totalOverheadCost: 0,
    totalHPP: 0,
    foodCostPercent: null,
    grossMarginPercent: null,
    warnings: [],
    productCount: 0,
  })

  const refresh = useCallback(async () => {
    const snapshots = hppService.getSnapshots()
    if (snapshots.length === 0) return

    const totalIngredient = snapshots.reduce((s, sn) => s + sn.ingredientHPP, 0)
    const totalPackaging = snapshots.reduce((s, sn) => s + sn.packagingHPP, 0)
    const totalOverhead = snapshots.reduce((s, sn) => s + sn.laborOverheadHPP, 0)
    const totalHPP = snapshots.reduce((s, sn) => s + sn.totalHPP, 0)
    const totalRevenue = snapshots.reduce((s, sn) => s + (sn.sellingPrice || 0), 0)

    setSummary({
      totalIngredientCost: totalIngredient,
      totalPackagingCost: totalPackaging,
      totalOverheadCost: totalOverhead,
      totalHPP,
      foodCostPercent: totalRevenue > 0 ? Math.round((totalHPP / totalRevenue) * 10000) / 100 : null,
      grossMarginPercent: totalRevenue > 0
        ? Math.round(((totalRevenue - totalHPP) / totalRevenue) * 10000) / 100
        : null,
      warnings: [],
      productCount: snapshots.length,
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { summary, refresh }
}

// ─── useHPPRecalculation ────────────────────────────────────────────

interface UseHPPRecalculationState {
  isRecalculating: boolean
  progress: number
  total: number
  error: string | null
}

export function useHPPRecalculation() {
  const [state, setState] = useState<UseHPPRecalculationState>({
    isRecalculating: false,
    progress: 0,
    total: 0,
    error: null,
  })

  const recalculateAll = useCallback(async (outletId: string) => {
    setState((prev) => ({ ...prev, isRecalculating: true, error: null }))
    try {
      const result = await hppService.recalculateAll(outletId)
      setState({
        isRecalculating: false,
        progress: result.totalProducts,
        total: result.totalProducts,
        error: result.errors > 0 ? `${result.errors} products had errors` : null,
      })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Recalculation failed'
      setState((prev) => ({ ...prev, isRecalculating: false, error: message }))
      return null
    }
  }, [])

  return { ...state, recalculateAll }
}

// ─── useOverheadConfig ──────────────────────────────────────────────

export function useOverheadConfig(outletId: string) {
  const [config, setConfig] = useState<OverheadConfig | null>(null)

  useEffect(() => {
    const cfg = hppService.getOverheadConfig(outletId)
    setConfig(cfg)
  }, [outletId])

  return { config }
}

// ─── useHPPDashboard ────────────────────────────────────────────────

export function useHPPDashboard(outletId: string) {
  const { results, summary, isLoading: isBatchLoading, calculateBatch } = useHPPBatch()
  const { summary: hppSummary, refresh: refreshSummary } = useHPPSummary()
  const { config } = useOverheadConfig(outletId)
  const { snapshots } = useHPPSnapshots()

  const calculateAll = useCallback(async () => {
    await calculateBatch(outletId, ['p1', 'p2', 'p3'], true)
    refreshSummary()
  }, [outletId, calculateBatch, refreshSummary])

  useEffect(() => {
    calculateAll()
  }, [calculateAll])

  return {
    results,
    batchSummary: summary,
    hppSummary,
    overheadConfig: config,
    snapshots,
    isCalculating: isBatchLoading,
    recalculateAll: calculateAll,
  }
}