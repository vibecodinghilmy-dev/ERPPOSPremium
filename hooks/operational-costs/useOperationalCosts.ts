import { useState, useEffect, useCallback } from 'react'
import { operationalCostEngine } from '../../services/operational-costs/engine'
import type { OperationalCostInput, OperationalCostRecord, CostSummary, MonthlyCostReport, CostTrend, CostCategory } from '../../services/operational-costs/types'

export function useOperationalCosts(outletId: string | null) {
  const [costs, setCosts] = useState<OperationalCostRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recordCost = useCallback(async (input: OperationalCostInput) => {
    return operationalCostEngine.recordCost(input)
  }, [])

  const fetchCosts = useCallback(async (startDate: string, endDate: string, category?: CostCategory) => {
    if (!outletId) return
    setIsLoading(true)
    try {
      const data = await operationalCostEngine.getCosts(outletId, startDate, endDate, category)
      setCosts(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [outletId])

  return { costs, isLoading, error, recordCost, fetchCosts }
}

export function useCostSummary(outletId: string | null, startDate: string, endDate: string) {
  const [summary, setSummary] = useState<CostSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!outletId) return
    setIsLoading(true)
    operationalCostEngine.getCostSummary(outletId, startDate, endDate)
      .then(setSummary)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [outletId, startDate, endDate])

  return { summary, isLoading }
}

export function useMonthlyCostReport(outletId: string | null, year: number, month: number) {
  const [report, setReport] = useState<MonthlyCostReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!outletId) return
    setIsLoading(true)
    operationalCostEngine.getMonthlyReport(outletId, year, month)
      .then(setReport)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [outletId, year, month])

  return { report, isLoading }
}

export function useCostTrends(outletId: string | null, months: number = 6) {
  const [trends, setTrends] = useState<CostTrend[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!outletId) return
    setIsLoading(true)
    operationalCostEngine.getTrends(outletId, months)
      .then(setTrends)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [outletId, months])

  return { trends, isLoading }
}