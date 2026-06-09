import { useState, useEffect, useCallback } from 'react'
import { profitEngine } from '../../services/profit/engine'
import type { OutletProfitSummary, MonthlyProfit, YearlyProfit } from '../../services/profit/types'

export function useOutletProfit(outletId: string | null, startDate?: string, endDate?: string) {
  const [profit, setProfit] = useState<OutletProfitSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculate = useCallback(async () => {
    if (!outletId) return
    setIsLoading(true)
    setError(null)
    try {
      const sDate = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const eDate = endDate || new Date().toISOString()
      const result = await profitEngine.calculateOutletProfit(outletId, {
        outletId,
        startDate: sDate,
        endDate: eDate,
      })
      setProfit(result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [outletId, startDate, endDate])

  useEffect(() => { calculate() }, [calculate])

  return { profit, isLoading, error, refetch: calculate }
}

export function useMonthlyProfits(outletId: string | null, year: number = new Date().getFullYear()) {
  const [months, setMonths] = useState<MonthlyProfit[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!outletId) return
    setIsLoading(true)
    profitEngine.calculateMonthlyProfits(outletId, year)
      .then(setMonths)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [outletId, year])

  return { months, isLoading }
}

export function useYearlyProfit(outletId: string | null, year: number = new Date().getFullYear()) {
  const [profit, setProfit] = useState<YearlyProfit | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!outletId) return
    setIsLoading(true)
    profitEngine.calculateYearlyProfit(outletId, year)
      .then(setProfit)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [outletId, year])

  return { profit, isLoading }
}