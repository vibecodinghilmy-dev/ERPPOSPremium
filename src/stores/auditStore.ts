import { create } from 'zustand'
import type { AuditLog, AuditModule, AuditAction, AuditFilter } from '@/types/audit'

interface AuditStore {
  logs: AuditLog[]
  isLoading: boolean
  filter: AuditFilter
  setFilter: (filter: Partial<AuditFilter>) => void
  resetFilter: () => void
  addLog: (entry: Omit<AuditLog, 'id' | 'created_at'>) => void
  fetchLogs: () => Promise<void>
  exportLogs: () => AuditLog[]
  clearLogs: () => void
}

// In-memory audit log store (will be replaced by Supabase in production)
let localLogs: AuditLog[] = []
let logCounter = 0

export const useAuditStore = create<AuditStore>((set, get) => ({
  logs: [],
  isLoading: false,
  filter: {},

  setFilter: (filter) => {
    set((state) => ({
      filter: { ...state.filter, ...filter },
    }))
  },

  resetFilter: () => {
    set({ filter: {} })
  },

  addLog: (entry) => {
    const newLog: AuditLog = {
      ...entry,
      id: `audit_${++logCounter}_${Date.now()}`,
      created_at: new Date().toISOString(),
    }
    localLogs = [newLog, ...localLogs]
    set((state) => ({
      logs: [newLog, ...state.logs],
    }))
  },

  fetchLogs: async () => {
    set({ isLoading: true })
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 300))
    const { filter } = get()
    let filtered = [...localLogs]

    if (filter.module) {
      filtered = filtered.filter((l) => l.module === filter.module)
    }
    if (filter.action) {
      filtered = filtered.filter((l) => l.action === filter.action)
    }
    if (filter.user_id) {
      filtered = filtered.filter((l) => l.user_id === filter.user_id)
    }
    if (filter.entity_type) {
      filtered = filtered.filter((l) => l.entity_type === filter.entity_type)
    }
    if (filter.date_from) {
      filtered = filtered.filter((l) => l.created_at >= filter.date_from!)
    }
    if (filter.date_to) {
      filtered = filtered.filter((l) => l.created_at <= filter.date_to!)
    }
    if (filter.search) {
      const s = filter.search.toLowerCase()
      filtered = filtered.filter(
        (l) =>
          l.entity_label.toLowerCase().includes(s) ||
          l.user_name.toLowerCase().includes(s) ||
          l.reason?.toLowerCase().includes(s),
      )
    }

    set({ logs: filtered, isLoading: false })
  },

  exportLogs: () => {
    return get().logs
  },

  clearLogs: () => {
    localLogs = []
    set({ logs: [] })
  },
}))

/**
 * Helper to add an audit log entry with current user context
 */
export function logAuditEvent(
  module: AuditModule,
  action: AuditAction,
  entityType: string,
  entityId: string,
  entityLabel: string,
  beforeData: Record<string, unknown> | null,
  afterData: Record<string, unknown> | null,
  reason?: string,
) {
  const store = useAuditStore.getState()
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
  let userName = 'System'
  let userRole = 'system'
  let userId = 'system'

  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      userName = user.full_name || 'Unknown'
      userRole = user.role || 'unknown'
      userId = user.id || 'unknown'
    } catch {
      // ignore
    }
  }

  store.addLog({
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    module,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_label: entityLabel,
    before_data: beforeData,
    after_data: afterData,
    reason: reason || null,
    ip_address: null,
  })
}