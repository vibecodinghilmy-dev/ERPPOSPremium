import { PackageOpen, AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { focusRing } from '@/lib/design-tokens'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  compact?: boolean
}

const defaultIcons: Record<string, React.ReactNode> = {
  default: <PackageOpen className="w-8 h-8 md:w-10 md:h-10" />,
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-12 md:py-16 px-6',
      )}
      role="status"
    >
      <div className={cn(
        'rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-4',
        compact ? 'w-12 h-12' : 'w-16 h-16',
      )}>
        {icon || defaultIcons.default}
      </div>

      <h3 className={cn(
        'font-semibold text-foreground',
        compact ? 'text-sm' : 'text-base md:text-lg',
      )}>
        {title}
      </h3>

      {description && (
        <p className={cn(
          'text-muted-foreground max-w-sm mt-1',
          compact ? 'text-xs' : 'text-sm',
        )}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          {action && (
            <Button
              size={compact ? 'sm' : 'default'}
              onClick={action.onClick}
              className={focusRing}
            >
              {action.icon || <Plus className="w-4 h-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              size={compact ? 'sm' : 'default'}
              onClick={secondaryAction.onClick}
              className={focusRing}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading data. Please try again.',
  error,
  onRetry,
}: {
  title?: string
  description?: string
  error?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 px-6 text-center" role="alert">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h3 className="text-base md:text-lg font-semibold text-destructive">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mt-1">{description}</p>
      {error && (
        <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted px-3 py-1.5 rounded-lg max-w-md truncate">
          {error}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
          Try Again
        </Button>
      )}
    </div>
  )
}