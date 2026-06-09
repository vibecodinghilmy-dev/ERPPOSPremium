import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Search, Download,
  Columns, Check, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Loader2, AlertCircle, FileSpreadsheet, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { animation, focusRing, touchTarget } from '@/lib/design-tokens'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'

// ─── Types ───────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc' | null

export interface SortConfig {
  key: string
  direction: SortDirection
}

export interface Column<T> {
  key: string
  header: string
  cell: (row: T, index: number) => React.ReactNode
  sortable?: boolean
  searchable?: boolean
  filterable?: boolean
  width?: string
  minWidth?: string
  align?: 'left' | 'center' | 'right'
  className?: string
  headerClassName?: string
  hidden?: boolean
}

export interface DataTableAction<T> {
  label: string
  icon?: React.ReactNode
  onClick: (selectedRows: T[]) => void
  disabled?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary'
}

export interface EnterpriseDataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  loadingRows?: number
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: React.ReactNode
  emptyAction?: React.ReactNode
  error?: string | null
  onRetry?: () => void
  sortable?: boolean
  defaultSort?: SortConfig
  onSort?: (sort: SortConfig | null) => void
  pageSize?: number
  pageSizeOptions?: number[]
  showPageSize?: boolean
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  getId?: (row: T) => string
  searchable?: boolean
  searchPlaceholder?: string
  globalSearch?: boolean
  onGlobalSearch?: (query: string) => void
  columnVisibility?: boolean
  defaultHiddenColumns?: string[]
  exportable?: boolean
  exportFileName?: string
  onExportCSV?: () => void
  onExportExcel?: () => void
  onExportPDF?: () => void
  stickyHeader?: boolean
  rowClassName?: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  actions?: DataTableAction<T>[]
  renderExpandedRow?: (row: T) => React.ReactNode
  summary?: React.ReactNode
}

// ─── Icons ────────────────────────────────────────────────────────────

const SortIcon = ({ direction }: { direction: SortDirection }) => {
  if (direction === 'asc') return <ChevronUp className="w-3.5 h-3.5" />
  if (direction === 'desc') return <ChevronDown className="w-3.5 h-3.5" />
  return <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
}

// ─── CSV Export Utility ──────────────────────────────────────────────

function exportToCSV<T>(data: T[], columns: Column<T>[], filename: string) {
  const visibleCols = columns.filter((c) => !c.hidden)
  const headers = visibleCols.map((c) => `"${c.header}"`).join(',')

  // We need to render cells as text — use special __exportValue or stringify
  const rows = data.map((row) =>
    visibleCols
      .map((col) => {
        const val = (row as Record<string, unknown>)[col.key]
        if (val === null || val === undefined) return ''
        const str = String(val)
        return `"${str.replace(/"/g, '""')}"`
      })
      .join(','),
  )

  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// ─── Loading Skeleton ────────────────────────────────────────────────

function TableSkeleton({ rows = 5, columns }: { rows: number; columns: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-4 bg-muted rounded flex-1" style={{ opacity: 1 - j * 0.15 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────

function EmptyTableState({
  title = 'No data found',
  description,
  icon,
  action,
}: {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        {icon || <AlertCircle className="w-7 h-7 text-muted-foreground" />}
      </div>
      <p className="text-base font-semibold text-foreground mb-1">{title}</p>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── Error State ─────────────────────────────────────────────────────

function ErrorTableState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-destructive" />
      </div>
      <p className="text-base font-semibold text-destructive mb-1">Failed to load data</p>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{error}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function EnterpriseDataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  loadingRows = 5,
  emptyTitle = 'No data found',
  emptyDescription,
  emptyIcon,
  emptyAction,
  error = null,
  onRetry,
  sortable = false,
  defaultSort,
  onSort,
  pageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = true,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  getId,
  searchable = false,
  searchPlaceholder = 'Search...',
  globalSearch = false,
  onGlobalSearch,
  columnVisibility = false,
  defaultHiddenColumns = [],
  exportable = false,
  exportFileName = 'export',
  onExportCSV,
  onExportExcel,
  onExportPDF,
  stickyHeader = false,
  rowClassName,
  onRowClick,
  actions,
  renderExpandedRow,
  summary,
}: EnterpriseDataTableProps<T>) {
  // ─── State ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1)
  const [localSort, setLocalSort] = useState<SortConfig | null>(defaultSort || null)
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(defaultHiddenColumns))
  const [localSearch, setLocalSearch] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(selectedIds)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({})
  const tableRef = useRef<HTMLDivElement>(null)

  // ─── Computed ───────────────────────────────────────────────────
  const visibleColumns = columns.filter((c) => !hiddenColumns.has(c.key))

  // Client-side search filtering
  const searchedData = useMemo(() => {
    if (!globalSearch && !searchable) return data
    if (!localSearch.trim()) return data

    const query = localSearch.toLowerCase()
    return data.filter((row) =>
      columns.some((col) => {
        if (!col.searchable) return false
        const val = row[col.key]
        if (val === null || val === undefined) return false
        return String(val).toLowerCase().includes(query)
      }),
    )
  }, [data, localSearch, columns, globalSearch, searchable])

  // Client-side column filtering
  const filteredData = useMemo(() => {
    let result = searchedData
    Object.entries(columnSearch).forEach(([key, value]) => {
      if (!value.trim()) return
      const q = value.toLowerCase()
      result = result.filter((row) => {
        const val = row[key]
        if (val === null || val === undefined) return false
        return String(val).toLowerCase().includes(q)
      })
    })
    return result
  }, [searchedData, columnSearch])

  // Sorting
  const sortedData = useMemo(() => {
    if (!localSort || !localSort.direction) return filteredData
    const { key, direction } = localSort
    return [...filteredData].sort((a, b) => {
      const aVal = a[key]
      const bVal = b[key]

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal
      }
      // Handle strings
      const aStr = String(aVal ?? '')
      const bStr = String(bVal ?? '')
      const cmp = aStr.localeCompare(bStr)
      return direction === 'asc' ? cmp : -cmp
    })
  }, [filteredData, localSort])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1)
  }, [data.length])

  // ─── Handlers ───────────────────────────────────────────────────
  const handleSort = useCallback(
    (key: string) => {
      if (!sortable) return
      setLocalSort((prev) => {
        const next: SortConfig =
          prev?.key === key
            ? prev.direction === 'asc'
              ? { key, direction: 'desc' }
              : prev.direction === 'desc'
                ? { key, direction: null }
                : { key, direction: 'asc' }
            : { key, direction: 'asc' }
        onSort?.(next.direction ? next : null)
        return next.direction ? next : null
      })
    },
    [sortable, onSort],
  )

  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === paginatedData.length && paginatedData.length > 0) {
      const newSet = new Set<string>()
      setSelectedRows(newSet)
      onSelectionChange?.(newSet)
    } else {
      const newSet = new Set<string>()
      paginatedData.forEach((row, i) => {
        const id = getId?.(row) || `${i}`
        newSet.add(id)
      })
      setSelectedRows(newSet)
      onSelectionChange?.(newSet)
    }
  }, [paginatedData, selectedRows, getId, onSelectionChange])

  const handleSelectRow = useCallback(
    (id: string) => {
      const newSet = new Set(selectedRows)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      setSelectedRows(newSet)
      onSelectionChange?.(newSet)
    },
    [selectedRows, onSelectionChange],
  )

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }, [])

  const toggleColumnVisibility = useCallback((key: string) => {
    setHiddenColumns((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(key)) newSet.delete(key)
      else newSet.add(key)
      return newSet
    })
  }, [])

  // ─── Render ─────────────────────────────────────────────────────
  const showHeader = sortable || selectable || columnVisibility || searchable || exportable || actions?.length

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          {(globalSearch || searchable) && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value)
                  onGlobalSearch?.(e.target.value)
                }}
                className="pl-8 h-8 text-xs"
              />
              {localSearch && (
                <button
                  onClick={() => {
                    setLocalSearch('')
                    onGlobalSearch?.('')
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {/* Column Visibility */}
            {columnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Columns className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline ml-1">Columns</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {columns.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.key}
                      checked={!hiddenColumns.has(col.key)}
                      onCheckedChange={() => toggleColumnVisibility(col.key)}
                    >
                      {col.header}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Bulk Actions */}
            {actions && selectedRows.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="muted" className="text-xs">
                  {selectedRows.size} selected
                </Badge>
                {actions.map((action, i) => (
                  <Button
                    key={i}
                    variant={action.variant || 'outline'}
                    size="sm"
                    className="h-8"
                    disabled={action.disabled}
                    onClick={() => action.onClick(
                      paginatedData.filter((_, idx) => selectedRows.has(getId?.(paginatedData[idx]) || `${idx}`))
                    )}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Export */}
            {exportable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline ml-1">Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    if (onExportCSV) onExportCSV()
                    else exportToCSV(data, columns, exportFileName)
                  }}>
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExportExcel?.()}>
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Export Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExportPDF?.()}>
                    <FileText className="w-3.5 h-3.5 mr-2" /> Export PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div
        ref={tableRef}
        className={cn(
          'rounded-xl border border-border bg-card overflow-hidden',
          stickyHeader && 'max-h-[600px] overflow-y-auto',
        )}
      >
        {/* Loading State */}
        {isLoading ? (
          <TableSkeleton rows={loadingRows} columns={visibleColumns.length + (selectable ? 1 : 0)} />
        ) : error ? (
          <ErrorTableState error={error} onRetry={onRetry} />
        ) : sortedData.length === 0 ? (
          <EmptyTableState title={emptyTitle} description={emptyDescription} icon={emptyIcon} action={emptyAction} />
        ) : (
          <table className="w-full text-sm">
            {/* Header */}
            <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
              <tr className="border-b border-border bg-muted/50">
                {/* Row selection checkbox */}
                {selectable && (
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                      onChange={handleSelectAll}
                      className={cn('rounded border-border', focusRing)}
                      aria-label="Select all rows"
                    />
                  </th>
                )}

                {/* Expand row */}
                {renderExpandedRow && <th className="w-8 px-1 py-3" />}

                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      sortable && col.sortable !== false && 'cursor-pointer select-none hover:text-foreground transition-colors',
                      col.headerClassName,
                    )}
                    style={{
                      width: col.width,
                      minWidth: col.minWidth,
                    }}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    aria-sort={
                      localSort?.key === col.key
                        ? localSort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.header}</span>
                      {sortable && col.sortable !== false && (
                        <SortIcon direction={localSort?.key === col.key ? localSort.direction : null} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {paginatedData.map((row, rowIndex) => {
                const rowId = getId?.(row) || `${rowIndex}`
                const isSelected = selectedRows.has(rowId)
                const isExpanded = expandedRows.has(rowId)

                return (
                  <tr
                    key={rowId}
                    className={cn(
                      'border-b border-border transition-colors',
                      isSelected ? 'bg-primary/5' : 'hover:bg-muted/30',
                      onRowClick && 'cursor-pointer',
                      rowIndex % 2 === 1 && !isSelected && 'bg-muted/20',
                      rowClassName?.(row, rowIndex),
                    )}
                    onClick={() => onRowClick?.(row)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && onRowClick) onRowClick(row)
                    }}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(rowId)}
                          className={cn('rounded border-border', focusRing)}
                          aria-label={`Select row ${rowIndex + 1}`}
                        />
                      </td>
                    )}

                    {/* Expand button */}
                    {renderExpandedRow && (
                      <td className="w-8 px-1 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleExpand(rowId)}
                          className={cn('p-1 rounded hover:bg-muted transition-colors', focusRing)}
                          aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                        >
                          <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-90')} />
                        </button>
                      </td>
                    )}

                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-3 py-3',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.className,
                        )}
                        style={{
                          width: col.width,
                          minWidth: col.minWidth,
                        }}
                      >
                        {col.cell(row, rowIndex)}
                      </td>
                    ))}
                  </tr>
                )
              })}

              {/* Expanded rows */}
              {renderExpandedRow &&
                paginatedData.map((row, rowIndex) => {
                  const rowId = getId?.(row) || `${rowIndex}`
                  if (!expandedRows.has(rowId)) return null
                  return (
                    <tr key={`expanded-${rowId}`}>
                      <td colSpan={visibleColumns.length + (selectable ? 1 : 0) + 1} className="p-4 bg-muted/20 border-b border-border">
                        {renderExpandedRow(row)}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      {summary && <div className="text-sm text-muted-foreground">{summary}</div>}

      {/* Pagination */}
      {!isLoading && !error && sortedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Showing{' '}
            <span className="font-semibold text-foreground">
              {Math.min((currentPage - 1) * pageSize + 1, sortedData.length)}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-foreground">
              {Math.min(currentPage * pageSize, sortedData.length)}
            </span>{' '}
            of <span className="font-semibold text-foreground">{sortedData.length}</span> results
          </p>

          <div className="flex items-center gap-2">
            {/* Page size */}
            {showPageSize && (
              <select
                value={pageSize}
                onChange={(e) => setCurrentPage(1)}
                className={cn(
                  'h-7 text-xs rounded-md border border-input bg-background px-2',
                  focusRing,
                )}
                aria-label="Rows per page"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            )}

            {/* Pagination buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className={cn('p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors', touchTarget.default, focusRing)}
                aria-label="First page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn('p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors', touchTarget.default, focusRing)}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-xs font-medium px-3 min-w-[80px] text-center tabular-nums">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={cn('p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors', touchTarget.default, focusRing)}
                aria-label="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className={cn('p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors', touchTarget.default, focusRing)}
                aria-label="Last page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}