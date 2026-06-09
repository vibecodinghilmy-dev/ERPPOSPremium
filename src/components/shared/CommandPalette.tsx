// ============================================================================
// Global Command Palette — Cmd+K / Ctrl+K
// ProStream ERP F&B — Fast search across modules
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, LayoutDashboard, ShoppingCart, Boxes, Package, BookOpen,
  TruckIcon, Store, Users, Trash2, ClipboardList, BarChart3,
  Settings, Shield, Command, ArrowRight, FileText, Hash,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { focusRing } from '@/lib/design-tokens'
import { useAuthStore } from '@/stores/authStore'

// ─── Types ───────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  label: string
  description?: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  category: 'page' | 'product' | 'ingredient' | 'recipe' | 'customer' | 'supplier' | 'report'
  shortcut?: string
}

// ─── Navigation Pages ────────────────────────────────────────────────

const PAGES: SearchResult[] = [
  { id: 'nav-dash', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'page', shortcut: 'G D' },
  { id: 'nav-pos', label: 'POS Terminal', path: '/pos', icon: ShoppingCart, category: 'page', shortcut: 'G P' },
  { id: 'nav-inv', label: 'Inventory', path: '/inventory', icon: Boxes, category: 'page', shortcut: 'G I' },
  { id: 'nav-prod', label: 'Products', path: '/products', icon: Package, category: 'page', shortcut: 'G R' },
  { id: 'nav-rec', label: 'Recipe Builder', path: '/recipes', icon: BookOpen, category: 'page', shortcut: 'G E' },
  { id: 'nav-pur', label: 'Purchases', path: '/purchases', icon: TruckIcon, category: 'page', shortcut: 'G U' },
  { id: 'nav-supp', label: 'Suppliers', path: '/suppliers', icon: Store, category: 'page', shortcut: 'G S' },
  { id: 'nav-cust', label: 'Customers', path: '/customers', icon: Users, category: 'page', shortcut: 'G C' },
  { id: 'nav-waste', label: 'Waste Logs', path: '/waste', icon: Trash2, category: 'page', shortcut: 'G W' },
  { id: 'nav-opname', label: 'Stock Opname', path: '/opname', icon: ClipboardList, category: 'page', shortcut: 'G O' },
  { id: 'nav-rep', label: 'Reports', path: '/reports', icon: BarChart3, category: 'page', shortcut: 'G R' },
  { id: 'nav-audit', label: 'Audit Trail', path: '/audit', icon: Shield, category: 'page', shortcut: 'G A' },
  { id: 'nav-set', label: 'Settings', path: '/settings', icon: Settings, category: 'page', shortcut: 'G T' },
]

// Mock data for search (in production, this would query the actual store)
const MOCK_ITEMS: SearchResult[] = [
  // Products
  { id: 'prod-1', label: 'Iced Caramel Macchiato', description: 'Rp 40,000 · Beverages', path: '/products', icon: Hash, category: 'product' },
  { id: 'prod-2', label: 'Double Cheese Burger', description: 'Rp 75,000 · Main Course', path: '/products', icon: Hash, category: 'product' },
  { id: 'prod-3', label: 'Matcha Latte', description: 'Rp 35,000 · Beverages', path: '/products', icon: Hash, category: 'product' },
  { id: 'prod-4', label: 'Salmon Poke Bowl', description: 'Rp 65,000 · Main Course', path: '/products', icon: Hash, category: 'product' },

  // Ingredients
  { id: 'ing-1', label: 'Premium Milk Base', description: 'Stok: 5,000 Ml · Min: 1,000 Ml', path: '/inventory', icon: Hash, category: 'ingredient' },
  { id: 'ing-2', label: 'Beef Patty Premium', description: 'Stok: 50 Pcs · Min: 30 Pcs', path: '/inventory', icon: Hash, category: 'ingredient' },
  { id: 'ing-3', label: 'Espresso Shot', description: 'Stok: 2,000 Ml · Min: 500 Ml', path: '/inventory', icon: Hash, category: 'ingredient' },
  { id: 'ing-4', label: 'Susu Full Cream (Diamond)', description: 'Stok: 2.5 Liter · KRITIS', path: '/inventory', icon: Hash, category: 'ingredient' },

  // Recipes
  { id: 'rec-1', label: 'Beng-Beng Ice', description: 'HPP: Rp 4,200 · Jual: Rp 15,000', path: '/recipes', icon: Hash, category: 'recipe' },
  { id: 'rec-2', label: 'Kopi Gula Aren', description: 'HPP: Rp 6,150 · Jual: Rp 18,000', path: '/recipes', icon: Hash, category: 'recipe' },
  { id: 'rec-3', label: 'Premium Cheeseburger', description: 'HPP: Rp 25,400 · Jual: Rp 75,000', path: '/recipes', icon: Hash, category: 'recipe' },
]

// ─── Component ───────────────────────────────────────────────────────

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter results
  const allResults = [...PAGES, ...MOCK_ITEMS]

  // Filter by user role — only owner can access audit
  const roleFiltered = allResults.filter((r) => {
    if (r.category === 'page') {
      if (!user?.role) return true
      // Only owner can see audit trail
      if (r.id === 'nav-audit' && user.role !== 'owner') return false
    }
    return true
  })

  const filtered = roleFiltered.filter((r) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      r.label.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    )
  }).slice(0, 12)

  // Group by category
  const grouped = filtered.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = []
    acc[r.category].push(r)
    return acc
  }, {})

  const categoryLabels: Record<string, string> = {
    page: 'Pages',
    product: 'Products',
    ingredient: 'Ingredients',
    recipe: 'Recipes',
    customer: 'Customers',
    supplier: 'Suppliers',
    report: 'Reports',
  }

  // ─── Handlers ──────────────────────────────────────────────────

  const handleSelect = useCallback(
    (result: SearchResult) => {
      navigate(result.path)
      onClose()
      setQuery('')
    },
    [navigate, onClose],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
        scrollToItem(selectedIndex + 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        scrollToItem(selectedIndex - 1)
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault()
        handleSelect(filtered[selectedIndex])
      } else if (e.key === 'Escape') {
        onClose()
        setQuery('')
      }
    },
    [filtered, selectedIndex, handleSelect, onClose],
  )

  const scrollToItem = (index: number) => {
    const items = listRef.current?.querySelectorAll('[data-search-item]')
    items?.[index]?.scrollIntoView({ block: 'nearest' })
  }

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Global keyboard listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          onClose()
        } else {
          // The parent will handle opening
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-50 animate-in fade-in duration-150"
        onClick={() => { onClose(); setQuery('') }}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="fixed left-1/2 top-[15%] -translate-x-1/2 w-full max-w-xl z-50 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, products, ingredients, recipes..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-0"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-mono text-muted-foreground">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Search className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">No results found</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Try searching for "{query}"
                </p>
              </div>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {categoryLabels[category] || category}
                  </div>
                  {items.map((result, idx) => {
                    const globalIdx = filtered.indexOf(result)
                    return (
                      <button
                        key={result.id}
                        data-search-item
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                          selectedIndex === globalIdx
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-muted',
                          focusRing,
                        )}
                      >
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                          selectedIndex === globalIdx ? 'bg-primary/10' : 'bg-muted',
                        )}>
                          <result.icon className={cn(
                            'w-3.5 h-3.5',
                            selectedIndex === globalIdx ? 'text-primary' : 'text-muted-foreground',
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.label}</p>
                          {result.description && (
                            <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                          )}
                        </div>
                        {result.shortcut && (
                          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground shrink-0">
                            {result.shortcut}
                          </kbd>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-muted/30">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono">↵</kbd> Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono">ESC</kbd> Close
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}