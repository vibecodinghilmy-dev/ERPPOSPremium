import { useState, useEffect, useCallback } from 'react'
import {
  Search, Download, RefreshCw, Filter, User, Calendar,
  Shield, Clock, Globe, ArrowUpDown, Trash2, AlertCircle
} from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuditStore } from '@/stores/auditStore'
import type { AuditLog, AuditModule, AuditAction, AuditFilter } from '@/types/audit'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { focusRing, touchTarget } from '@/lib/design-tokens'

const moduleLabels: Record<AuditModule, string> = {
  auth: 'Authentication',
  dashboard: 'Dashboard',
  pos: 'POS',
  inventory: 'Inventory',
  products: 'Products',
  recipes: 'Recipes',
  purchases: 'Purchases',
  suppliers: 'Suppliers',
  customers: 'Customers',
  waste: 'Waste',
  opname: 'Stock Opname',
  reports: 'Reports',
  settings: 'Settings',
}

const actionBadge: Record<AuditAction, { label: string; variant: 'success' | 'destructive' | 'warning' | 'info' | 'muted' }> = {
  create: { label: 'Create', variant: 'success' },
  update: { label: 'Update', variant: 'info' },
  delete: { label: 'Delete', variant: 'destructive' },
  approve: { label: 'Approve', variant: 'success' },
  reject: { label: 'Reject', variant: 'destructive' },
  void: { label: 'Void', variant: 'destructive' },
  refund: { label: 'Refund', variant: 'warning' },
  login: { label: 'Login', variant: 'info' },
  logout: { label: 'Logout', variant: 'muted' },
  export: { label: 'Export', variant: 'muted' },
  bulk_update: { label: 'Bulk Update', variant: 'warning' },
}

export function AuditLogPage() {
  const { logs, isLoading, filter, setFilter, resetFilter, fetchLogs } = useAuditStore()
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setFilter({ search: value })
  }, [setFilter])

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Role', 'Module', 'Action', 'Entity', 'Reason', 'IP Address'].join(','),
      ...logs.map((log) =>
        [
          log.created_at,
          log.user_name,
          log.user_role,
          log.module,
          log.action,
          log.entity_label,
          log.reason || '',
          log.ip_address || '',
        ]
          .map((v) => `"${v}"`)
          .join(','),
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="flex flex-col">
      <TopBar
        title="Audit Trail"
        subtitle="Complete history of all system activities and changes"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            </Button>
          </div>
        }
      />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total Events</p>
            <p className="text-2xl font-black mt-1 tabular-nums">{logs.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Unique Users</p>
            <p className="text-2xl font-black mt-1 tabular-nums">
              {new Set(logs.map((l) => l.user_id)).size}
            </p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Modules Tracked</p>
            <p className="text-2xl font-black mt-1 tabular-nums">
              {new Set(logs.map((l) => l.module)).size}
            </p>
          </CardContent></Card>
          <Card className="bg-primary text-primary-foreground border-0"><CardContent className="p-4">
            <p className="text-xs opacity-70 font-semibold uppercase tracking-wide">Today's Events</p>
            <p className="text-2xl font-black mt-1 tabular-nums">
              {logs.filter((l) => l.created_at.startsWith(new Date().toISOString().split('T')[0])).length}
            </p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by entity, user, or reason..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Select
                value={filter.module || 'all'}
                onValueChange={(v) => setFilter({ module: v === 'all' ? undefined : v as AuditModule })}
              >
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {Object.entries(moduleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filter.action || 'all'}
                onValueChange={(v) => setFilter({ action: v === 'all' ? undefined : v as AuditAction })}
              >
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {Object.entries(actionBadge).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(filter.module || filter.action || filter.search) && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
                  resetFilter()
                  setSearch('')
                }}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Entries */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Loading audit logs...</span>
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-base font-semibold text-foreground">No audit logs found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Audit events will appear here as actions are performed
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log) => {
                  const actionConfig = actionBadge[log.action]
                  const isExpanded = expandedId === log.id

                  return (
                    <div
                      key={log.id}
                      className={cn(
                        'transition-colors',
                        isExpanded ? 'bg-muted/30' : 'hover:bg-muted/20',
                      )}
                    >
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="w-full text-left p-4 flex items-start gap-3"
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                          actionConfig.variant === 'destructive' ? 'bg-destructive/10 text-destructive' :
                          actionConfig.variant === 'warning' ? 'bg-warning/10 text-warning' :
                          actionConfig.variant === 'success' ? 'bg-success/10 text-success' :
                          'bg-primary/10 text-primary',
                        )}>
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{log.user_name}</span>
                            <Badge variant={actionConfig.variant} className="text-[10px] uppercase">
                              {actionConfig.label}
                            </Badge>
                            <Badge variant="muted" className="text-[10px]">
                              {moduleLabels[log.module as AuditModule] || log.module}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground mt-0.5">
                            <span className="font-medium">{log.entity_label}</span>
                            {log.reason && (
                              <span className="text-muted-foreground"> — {log.reason}</span>
                            )}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(log.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {log.user_role}
                            </span>
                          </div>
                        </div>
                        <div className={cn(
                          'w-5 h-5 flex items-center justify-center transition-transform',
                          isExpanded && 'rotate-180',
                        )}>
                          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pl-[60px] space-y-3">
                          {/* Data Changes */}
                          {(log.before_data || log.after_data) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {log.before_data && (
                                <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                                  <p className="text-xs font-semibold text-destructive mb-2">Before</p>
                                  <pre className="text-xs text-muted-foreground overflow-x-auto">
                                    {JSON.stringify(log.before_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.after_data && (
                                <div className="p-3 bg-success/5 rounded-lg border border-success/20">
                                  <p className="text-xs font-semibold text-success mb-2">After</p>
                                  <pre className="text-xs text-muted-foreground overflow-x-auto">
                                    {JSON.stringify(log.after_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Meta */}
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              IP: {log.ip_address || 'N/A'}
                            </span>
                            <span>Entity ID: {log.entity_id}</span>
                            <span>Module: {log.module}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}