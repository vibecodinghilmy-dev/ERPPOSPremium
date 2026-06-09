/**
 * ProStream ERP Design Tokens
 * Centralized typography, spacing, and color tokens
 * No arbitrary values — use these tokens exclusively
 */

export const typography = {
  display: 'text-4xl font-black tracking-tight',
  heading1: 'text-2xl font-bold tracking-tight',
  heading2: 'text-xl font-bold tracking-tight',
  heading3: 'text-lg font-semibold',
  title: 'text-base font-semibold',
  body: 'text-sm font-normal',
  bodySmall: 'text-xs font-normal',
  label: 'text-xs font-medium',
  caption: 'text-xs text-muted-foreground',
  data: 'text-sm font-bold tabular-nums',
  dataLarge: 'text-2xl font-black tabular-nums',
  dataSmall: 'text-xs font-semibold tabular-nums',
  mono: 'font-mono text-xs',
} as const

export const spacing = {
  page: 'p-4 md:p-6',
  section: 'space-y-4 md:space-y-6',
  card: 'p-4 md:p-5',
  cardCompact: 'p-3',
  grid: 'gap-3 md:gap-4',
  stack: 'space-y-3 md:space-y-4',
  inline: 'gap-2 md:gap-3',
} as const

export const colors = {
  // Semantic status colors - use these consistently
  status: {
    critical: 'text-destructive bg-destructive/10 border-destructive/30',
    low: 'text-warning bg-warning/10 border-warning/30',
    normal: 'text-success bg-success/10 border-success/30',
    excess: 'text-primary bg-primary/10 border-primary/20',
    pending: 'text-warning bg-warning/10 border-warning/30',
    approved: 'text-success bg-success/10 border-success/30',
    rejected: 'text-destructive bg-destructive/10 border-destructive/30',
    draft: 'text-muted-foreground bg-muted border-border',
    received: 'text-success bg-success/10 border-success/30',
    cancelled: 'text-destructive bg-destructive/10 border-destructive/30',
    active: 'text-success bg-success/10 border-success/30',
    inactive: 'text-muted-foreground bg-muted border-border',
    paid: 'text-success bg-success/10 border-success/30',
    refunded: 'text-warning bg-warning/10 border-warning/30',
    void: 'text-destructive bg-destructive/10 border-destructive/30',
  },
  // Badge variants mapped to CSS variables
  badge: {
    default: 'bg-primary/10 text-primary border-transparent',
    secondary: 'bg-secondary/10 text-secondary border-transparent',
    success: 'bg-success/10 text-success border-transparent',
    warning: 'bg-warning/10 text-warning border-transparent',
    destructive: 'bg-destructive/10 text-destructive border-transparent',
    info: 'bg-accent text-primary border-transparent',
    muted: 'bg-muted text-muted-foreground border-transparent',
    outline: 'bg-transparent text-foreground border-border',
  },
} as const

export const animation = {
  hover: 'transition-all duration-150',
  click: 'active:scale-[0.98]',
  enter: 'animate-in fade-in zoom-in-95 duration-150',
  exit: 'animate-out fade-out zoom-out-95 duration-100',
  spin: 'animate-spin',
  pulse: 'animate-pulse',
} as const

export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export const touchTarget = {
  mobile: 'min-h-[44px] min-w-[44px]',
  default: 'min-h-[36px] min-w-[36px]',
}