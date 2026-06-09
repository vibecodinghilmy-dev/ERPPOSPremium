import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  iconBg?: string
  className?: string
  valueClassName?: string
}

export function StatsCard({ title, value, change, changeLabel, icon, iconBg, className, valueClassName }: StatsCardProps) {
  const isPositive = (change ?? 0) > 0
  const isNegative = (change ?? 0) < 0
  const isNeutral = change === undefined || change === 0

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('p-2 rounded-lg', iconBg || 'bg-primary/10 text-primary')}>
            {icon}
          </div>
          {!isNeutral && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-semibold',
              isPositive ? 'text-success' : 'text-destructive'
            )}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{isPositive ? '+' : ''}{change?.toFixed(1)}%</span>
            </div>
          )}
          {isNeutral && change !== undefined && (
            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Minus className="w-3 h-3" />
              <span>0%</span>
            </div>
          )}
        </div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
        <p className={cn('text-2xl font-bold text-foreground tabular-nums', valueClassName)}>{value}</p>
        {changeLabel && (
          <p className="text-xs text-muted-foreground mt-1">{changeLabel}</p>
        )}
      </CardContent>
    </Card>
  )
}
