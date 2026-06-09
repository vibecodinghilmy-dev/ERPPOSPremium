import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState, EmptyState } from '.'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  cell: (row: T, index: number) => React.ReactNode
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  rowClassName?: (row: T, index: number) => string
  onRowClick?: (row: T) => void
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyTitle = 'No data found',
  emptyDescription,
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingState />
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key} className={col.headerClassName}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, index) => (
          <TableRow
            key={index}
            className={cn(
              rowClassName?.(row, index),
              onRowClick && 'cursor-pointer'
            )}
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((col) => (
              <TableCell key={col.key} className={col.className}>
                {col.cell(row, index)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
