import { useState } from 'react'
import { Bell, Search, Calendar, Sun, Moon, Command } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, cn } from '@/lib/utils'
import { focusRing } from '@/lib/design-tokens'

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  onSearch?: () => void
}

export function TopBar({ title, subtitle, actions, onSearch }: TopBarProps) {
  const [isDark, setIsDark] = useState(false)

  const toggleDark = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="h-16 px-6 sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-bold text-foreground leading-none truncate">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {/* Global Search Button */}
        <button
          onClick={onSearch}
          className={cn(
            'relative hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-xs text-muted-foreground border border-border',
            focusRing,
          )}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
          <kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono text-[9px]">⌘K</kbd>
        </button>

        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-lg hidden md:flex">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(new Date())}</span>
        </div>

        <Button variant="ghost" size="icon-sm" onClick={toggleDark}>
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        <Button variant="ghost" size="icon-sm" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />
        </Button>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
