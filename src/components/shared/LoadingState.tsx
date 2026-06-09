import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  text?: string
  compact?: boolean
}

export function LoadingState({ text = 'Loading...', compact = false }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center text-muted-foreground',
        compact ? 'py-8' : 'py-16',
      )}
      role="status"
      aria-label={text}
    >
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{text}</span>
      </div>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

// ─── Skeleton Components ────────────────────────────────────────────

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} style={style} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/50">
        {Array.from({ length: columns }).map((_, j) => (
          <Skeleton key={j} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton
              key={j}
              className="h-4 flex-1"
              style={{ opacity: 1 - j * 0.15 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ height = 220 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <SkeletonCards count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonChart height={120} />
        <SkeletonChart height={120} />
        <SkeletonChart height={120} />
      </div>
      <SkeletonChart height={220} />
      <SkeletonTable rows={4} columns={4} />
    </div>
  )
}

export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-full mt-2" />
    </div>
  )
}