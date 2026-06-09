import { useState } from 'react'
import { Plus, Search, Edit, Trash2, Tag, ToggleLeft, ToggleRight } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatPercent, calculateFoodCostPercent, calculateMargin } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  category: string
  price: number
  hpp: number
  isActive: boolean
  isAvailable: boolean
  emoji: string
}

const mockProducts: Product[] = [
  { id: 'p1', name: 'Iced Caramel Macchiato', category: 'Beverages', price: 40000, hpp: 11200, isActive: true, isAvailable: true, emoji: '☕' },
  { id: 'p2', name: 'Double Cheese Burger', category: 'Main Course', price: 75000, hpp: 28500, isActive: true, isAvailable: true, emoji: '🍔' },
  { id: 'p3', name: 'Truffle Fries', category: 'Snacks', price: 38000, hpp: 10640, isActive: true, isAvailable: true, emoji: '🍟' },
  { id: 'p4', name: 'Matcha Latte', category: 'Beverages', price: 35000, hpp: 8750, isActive: true, isAvailable: true, emoji: '🍵' },
  { id: 'p5', name: 'Salmon Poke Bowl', category: 'Main Course', price: 65000, hpp: 24700, isActive: true, isAvailable: true, emoji: '🥗' },
  { id: 'p6', name: 'Margherita Pizza', category: 'Main Course', price: 75000, hpp: 22500, isActive: true, isAvailable: true, emoji: '🍕' },
  { id: 'p7', name: 'Baja Fish Tacos', category: 'Main Course', price: 48000, hpp: 16800, isActive: true, isAvailable: true, emoji: '🌮' },
  { id: 'p8', name: 'Lava Cake', category: 'Desserts', price: 42000, hpp: 12600, isActive: true, isAvailable: true, emoji: '🎂' },
  { id: 'p9', name: 'Chicken Salad', category: 'Main Course', price: 52000, hpp: 18200, isActive: true, isAvailable: false, emoji: '🥙' },
  { id: 'p10', name: 'Spring Rolls', category: 'Appetizers', price: 28000, hpp: 7560, isActive: true, isAvailable: true, emoji: '🥢' },
  { id: 'p11', name: 'Tiramisu', category: 'Desserts', price: 45000, hpp: 13500, isActive: false, isAvailable: false, emoji: '🍰' },
  { id: 'p12', name: 'Signature Burger', category: 'Main Course', price: 58000, hpp: 20300, isActive: true, isAvailable: true, emoji: '🍔' },
]

const categories = [...new Set(mockProducts.map(p => p.category))]

export function ProductsPage() {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [products, setProducts] = useState(mockProducts)
  const [newProduct, setNewProduct] = useState({ name: '', category: '', price: '', hpp: '' })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'all' || p.category === catFilter
    return matchSearch && matchCat
  })

  const handleToggleAvailable = (id: string) => {
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, isAvailable: !p.isAvailable } : p
    ))
    const product = products.find(p => p.id === id)
    toast.success(`${product?.name} ${product?.isAvailable ? 'disabled' : 'enabled'}`)
  }

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) { toast.error('Fill required fields'); return }
    const product: Product = {
      id: `p${Date.now()}`,
      name: newProduct.name,
      category: newProduct.category || 'Others',
      price: parseFloat(newProduct.price) || 0,
      hpp: parseFloat(newProduct.hpp) || 0,
      isActive: true,
      isAvailable: true,
      emoji: '🍽️',
    }
    setProducts(prev => [product, ...prev])
    toast.success(`${product.name} added`)
    setShowAddDialog(false)
    setNewProduct({ name: '', category: '', price: '', hpp: '' })
  }

  return (
    <div className="flex flex-col">
      <TopBar
        title="Products"
        subtitle={`${products.filter(p => p.isActive).length} active products`}
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Product
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Products', value: products.length, icon: '📦' },
            { label: 'Active', value: products.filter(p => p.isActive).length, icon: '✅' },
            { label: 'Available Now', value: products.filter(p => p.isAvailable).length, icon: '🟢' },
            { label: 'Avg Food Cost', value: formatPercent(products.reduce((s, p) => s + calculateFoodCostPercent(p.hpp, p.price), 0) / products.length), icon: '📊' },
          ].map(({ label, value, icon }) => (
            <Card key={label}><CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className="text-xl font-black">{value}</p>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product) => {
            const foodCost = calculateFoodCostPercent(product.hpp, product.price)
            const margin = calculateMargin(product.hpp, product.price)
            return (
              <Card key={product.id} className={`hover:shadow-md transition-all ${!product.isActive ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{product.emoji}</div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleAvailable(product.id)}
                        className={`transition-colors ${product.isAvailable ? 'text-success' : 'text-muted-foreground'}`}
                        title={product.isAvailable ? 'Mark unavailable' : 'Mark available'}
                      >
                        {product.isAvailable
                          ? <ToggleRight className="w-5 h-5" />
                          : <ToggleLeft className="w-5 h-5" />
                        }
                      </button>
                    </div>
                  </div>

                  <p className="font-semibold text-sm text-foreground mb-1 leading-tight">{product.name}</p>
                  <Badge variant="muted" className="text-[10px] mb-3">{product.category}</Badge>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Harga Jual</span>
                      <span className="font-bold text-primary tabular-nums">{formatCurrency(product.price)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">HPP</span>
                      <span className="font-semibold tabular-nums">{formatCurrency(product.hpp)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-border">
                      <span className="text-muted-foreground">Food Cost</span>
                      <span className={`font-bold tabular-nums ${foodCost > 35 ? 'text-destructive' : foodCost > 30 ? 'text-warning' : 'text-success'}`}>
                        {formatPercent(foodCost)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Margin</span>
                      <span className="font-bold text-success tabular-nums">{formatPercent(margin)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <Button variant="outline" size="sm" className="flex-1 h-7 text-xs">
                      <Edit className="w-3 h-3" /> Edit
                    </Button>
                    {!product.isAvailable && (
                      <Badge variant="muted" className="text-[10px] self-center">Unavailable</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { key: 'name', label: 'Product Name *', placeholder: 'e.g. Iced Latte' },
              { key: 'category', label: 'Category', placeholder: 'e.g. Beverages' },
              { key: 'price', label: 'Selling Price (Rp) *', placeholder: '0', type: 'number' },
              { key: 'hpp', label: 'HPP / COGS (Rp)', placeholder: '0', type: 'number' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input
                  type={type || 'text'}
                  placeholder={placeholder}
                  value={newProduct[key as keyof typeof newProduct]}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, [key]: e.target.value }))}
                  className="mt-1"
                />
              </div>
            ))}
            {newProduct.price && newProduct.hpp && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Preview:</p>
                <div className="flex justify-between text-xs">
                  <span>Food Cost %</span>
                  <span className="font-bold">{formatPercent(calculateFoodCostPercent(parseFloat(newProduct.hpp), parseFloat(newProduct.price)))}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span>Margin</span>
                  <span className="font-bold text-success">{formatPercent(calculateMargin(parseFloat(newProduct.hpp), parseFloat(newProduct.price)))}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddProduct}>Add Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
