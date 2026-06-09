import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Menu, Command, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { focusRing } from '@/lib/design-tokens'
import { CommandPalette } from '@/components/shared/CommandPalette'

export function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Global Cmd+K / Ctrl+K handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setIsCommandPaletteOpen((prev) => !prev)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div className={cn(
        'flex-1 flex flex-col overflow-hidden',
        'md:ml-20 lg:ml-64',
      )}>
        {/* Mobile header */}
        {isMobile && (
          <header className="h-12 px-4 border-b border-border bg-background/95 backdrop-blur flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={cn('p-2 -ml-2 rounded-lg hover:bg-muted transition-colors', focusRing)}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Search className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-black text-primary">ProStream</span>
            </div>
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className={cn('ml-auto p-2 rounded-lg hover:bg-muted transition-colors', focusRing)}
              aria-label="Open command palette"
            >
              <Command className="w-4 h-4" />
            </button>
          </header>
        )}

        {/* Cmd+K Hint (desktop) */}
        <div className="hidden md:block fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border shadow-lg hover:shadow-xl hover:bg-muted transition-all text-xs text-muted-foreground"
          >
            <Command className="w-3.5 h-3.5" />
            <span>Quick Search</span>
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">⌘K</kbd>
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}