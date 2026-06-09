import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, QrCode, Banknote, Check, X,
  Keyboard, Hash,
} from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { usePOSStore, usePOSSelectors } from '@/stores/posStore'
import { formatCurrency, cn } from '@/lib/utils'
import { focusRing } from '@/lib/design-tokens'
import toast from 'react-hot-toast'

const categories = ['All Items', 'Main Course', 'Appetizers', 'Beverages', 'Desserts', 'Snacks']

const products = [
  { id: 'p1', name: 'Salmon Poke Bowl', price: 65000, hpp: 28000, category: 'Main Course', available: true, emoji: '🥗' },
  { id: 'p2', name: 'Signature Burger', price: 58000, hpp: 22000, category: 'Main Course', available: true, emoji: '🍔' },
  { id: 'p3', name: 'Iced Caramel Latte', price: 32000, hpp: 8500, category: 'Beverages', available: true, emoji: '🧋' },
  { id: 'p4', name: 'Margherita Pizza', price: 75000, hpp: 30000, category: 'Main Course', available: true, emoji: '🍕' },
  { id: 'p5', name: 'Baja Fish Tacos', price: 48000, hpp: 19000, category: 'Main Course', available: true, emoji: '🌮' },
  { id: 'p6', name: 'Lava Cake', price: 42000, hpp: 15000, category: 'Desserts', available: true, emoji: '🎂' },
  { id: 'p7', name: 'Chicken Salad', price: 52000, hpp: 21000, category: 'Main Course', available: true, emoji: '🥙' },
  { id: 'p8', name: 'Matcha Latte', price: 35000, hpp: 9500, category: 'Beverages', available: true, emoji: '🍵' },
  { id: 'p9', name: 'Truffle Fries', price: 38000, hpp: 12000, category: 'Snacks', available: true, emoji: '🍟' },
  { id: 'p10', name: 'Caramel Macchiato', price: 40000, hpp: 10000, category: 'Beverages', available: true, emoji: '☕' },
  { id: 'p11', name: 'Spring Rolls', price: 28000, hpp: 9000, category: 'Appetizers', available: true, emoji: '🥢' },
  { id: 'p12', name: 'Tiramisu', price: 45000, hpp: 16000, category: 'Desserts', available: false, emoji: '🍰' },
]

export function POSPage() {
  const [activeCategory, setActiveCategory] = useState('All Items')
  const [search, setSearch] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const searchRef = useRef<HTMLInputElement>(null)
  const productGridRef = useRef<HTMLDivElement>(null)

  const {
    cart, orderType, paymentMethod,
    addItem, setQuantity, removeItem, clearCart,
    setOrderType, setPaymentMethod,
  } = usePOSStore()

  const subtotal = usePOSSelectors.subtotal(usePOSStore.getState())
  const tax = usePOSSelectors.tax(usePOSStore.getState())
  const total = usePOSSelectors.total(usePOSStore.getState())
  const itemCount = usePOSSelectors.itemCount(usePOSStore.getState())

  const filtered = products.filter((p) => {
    const matchCat = activeCategory === 'All Items' || p.category === activeCategory
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleAddToCart = useCallback((product: typeof products[0]) => {
    if (!product.available) { toast.error('Product not available'); return }
    addItem({
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: product.price,
      discount_amount: 0,
      total_price: product.price,
      hpp_at_sale: product.hpp,
    })
    toast.success(`${product.name} added`, { duration: 1000 })
  }, [addItem])

  const handleProcessPayment = useCallback(() => {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    toast.success(`Payment processed! Total: ${formatCurrency(total)}`)
    clearCart()
    setShowPayment(false)
  }, [cart.length, total, clearCart])

  // ─── Keyboard Shortcuts ──────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in search
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'F1':
          e.preventDefault()
          searchRef.current?.focus()
          break
        case 'F2':
          e.preventDefault()
          toast.success('Customer selection (F2)')
          break
        case 'F3':
          e.preventDefault()
          toast.success('Discount (F3)')
          break
        case 'F4':
          e.preventDefault()
          setShowPayment(true)
          break
        case 'Escape':
          e.preventDefault()
          searchRef.current?.blur()
          break
      }

      // Ctrl+Enter to complete sale
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleProcessPayment()
      }

      // Number keys for quantity (1-9)
      if (e.key >= '1' && e.key <= '9' && focusedIndex >= 0 && focusedIndex < filtered.length) {
        const product = filtered[focusedIndex]
        if (product.available) {
          addItem({
            product_id: product.id,
            product_name: product.name,
            quantity: parseInt(e.key),
            unit_price: product.price,
            discount_amount: 0,
            total_price: product.price * parseInt(e.key),
            hpp_at_sale: product.hpp,
          })
          toast.success(`${product.name} x${e.key}`, { duration: 800 })
        }
      }

      // Arrow keys for product grid navigation
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => Math.max(prev - 1, 0))
      }
      if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < filtered.length) {
        e.preventDefault()
        handleAddToCart(filtered[focusedIndex])
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered, focusedIndex, handleAddToCart, handleProcessPayment, addItem])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar
        title="POS Terminal"
        subtitle={`Shift: Morning | Terminal 01`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => setShowShortcuts(!showShortcuts)}>
            <Keyboard className="w-3.5 h-3.5" />
            <span className="text-xs ml-1 hidden sm:inline">Shortcuts</span>
          </Button>
        }
      />

      {/* Quick Reference Panel */}
      {showShortcuts && (
        <div className="bg-card border-b border-border px-6 py-3 animate-in slide-in-from-top duration-150">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">F1</kbd> Search</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">F2</kbd> Customer</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">F3</kbd> Discount</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">F4</kbd> Payment</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">1-9</kbd> Qty</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">⌘↵</kbd> Complete</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">ESC</kbd> Clear</span>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Product Grid */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
          <div className="p-4 pb-2 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder="Search menu items... (F1)"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setFocusedIndex(-1) }}
                className="pl-9 bg-background"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setFocusedIndex(-1) }}
                  className={cn(
                    'px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                    activeCategory === cat
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-background text-muted-foreground border border-border hover:bg-muted',
                    focusRing,
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div ref={productGridRef} className="flex-1 overflow-y-auto p-4 pt-2">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((product, idx) => {
                const inCart = cart.find((c) => c.product_id === product.id)
                const isFocused = idx === focusedIndex
                return (
                  <button
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    disabled={!product.available}
                    className={cn(
                      'bg-background border rounded-xl p-4 text-left transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed relative',
                      inCart ? 'border-primary/30 bg-primary/5' : 'border-border',
                      isFocused && 'ring-2 ring-primary ring-offset-2',
                    )}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                        {inCart.quantity}
                      </div>
                    )}
                    <div className="text-3xl mb-3">{product.emoji}</div>
                    <p className="text-sm font-semibold text-foreground leading-tight mb-1">{product.name}</p>
                    <p className="text-sm font-bold text-primary tabular-nums">{formatCurrency(product.price)}</p>
                    {!product.available && (
                      <Badge variant="muted" className="mt-1 text-[10px]">Out of stock</Badge>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Cart Panel */}
        <div className="w-80 bg-card border-l border-border flex flex-col shrink-0">
          {/* Cart Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-foreground">Order #{Math.floor(Math.random() * 9000 + 1000)}</p>
                <p className="text-xs text-muted-foreground">{itemCount} items</p>
              </div>
              {cart.length > 0 && (
                <Button variant="ghost" size="icon-sm" onClick={clearCart} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex gap-1.5">
              {(['dine_in', 'take_away', 'delivery'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    orderType === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    focusRing,
                  )}
                >
                  {type === 'dine_in' ? 'Dine In' : type === 'take_away' ? 'Takeaway' : 'Delivery'}
                </button>
              ))}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <ShoppingCart className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Cart is empty</p>
                <p className="text-xs text-muted-foreground">Add items from the menu</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product_id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.product_name}</p>
                    <p className="text-xs text-primary font-semibold tabular-nums">{formatCurrency(item.unit_price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setQuantity(item.product_id, item.quantity - 1)}
                      className={cn('w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors', focusRing)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => setQuantity(item.product_id, item.quantity + 1)}
                      className={cn('w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors', focusRing)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="w-8 h-8 rounded-md text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors ml-0.5"
                      aria-label="Remove item"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary */}
          <div className="p-4 border-t border-border space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (11%)</span>
                <span className="tabular-nums">{formatCurrency(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'cash' as const, label: 'Tunai', icon: Banknote },
                  { key: 'qris' as const, label: 'QRIS', icon: QrCode },
                  { key: 'debit' as const, label: 'Card', icon: CreditCard },
                ]).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setPaymentMethod(key)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-semibold transition-all',
                      paymentMethod === key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted',
                      focusRing,
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleProcessPayment}
              className="w-full h-11 text-base font-bold"
              disabled={cart.length === 0}
            >
              <Check className="w-5 h-5" />
              Bayar Sekarang
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}