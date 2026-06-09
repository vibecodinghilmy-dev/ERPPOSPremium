import { useState } from 'react'
import { Plus, Trash2, Save, ChevronRight, Calculator, BookOpen } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatPercent, calculateFoodCostPercent, calculateMargin } from '@/lib/utils'
import toast from 'react-hot-toast'

interface RecipeItem {
  id: string
  ingredientId: string
  ingredientName: string
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
}

interface Recipe {
  id: string
  productId: string
  productName: string
  sellingPrice: number
  version: number
  status: 'draft' | 'active' | 'archived'
  totalHPP: number
  items: RecipeItem[]
}

const ingredients = [
  { id: 'i1', name: 'Beng-Beng Wafer', unit: 'Pcs', costPerUnit: 2500 },
  { id: 'i2', name: 'Premium Milk Base', unit: 'Ml', costPerUnit: 1.2 },
  { id: 'i3', name: 'Chocolate Topping', unit: 'Gr', costPerUnit: 0.5 },
  { id: 'i4', name: 'Espresso Shot', unit: 'Ml', costPerUnit: 3 },
  { id: 'i5', name: 'Caramel Syrup', unit: 'Ml', costPerUnit: 2.5 },
  { id: 'i6', name: 'Oat Milk', unit: 'Ml', costPerUnit: 1.8 },
  { id: 'i7', name: 'Cup 16oz', unit: 'Pcs', costPerUnit: 1200 },
  { id: 'i8', name: 'Straw', unit: 'Pcs', costPerUnit: 200 },
  { id: 'i9', name: 'Beef Patty Premium', unit: 'Pcs', costPerUnit: 18500 },
  { id: 'i10', name: 'Burger Bun', unit: 'Pcs', costPerUnit: 4500 },
  { id: 'i11', name: 'Cheddar Cheese', unit: 'Gr', costPerUnit: 1.8 },
]

const mockRecipes: Recipe[] = [
  {
    id: 'r1', productId: 'p1', productName: 'Beng-Beng Ice', sellingPrice: 15000, version: 1, status: 'active',
    totalHPP: 4200,
    items: [
      { id: 'ri1', ingredientId: 'i1', ingredientName: 'Beng-Beng Wafer', quantity: 1, unit: 'Pcs', unitCost: 2500, totalCost: 2500 },
      { id: 'ri2', ingredientId: 'i2', ingredientName: 'Premium Milk Base', quantity: 1000, unit: 'Ml', unitCost: 1.2, totalCost: 1200 },
      { id: 'ri3', ingredientId: 'i3', ingredientName: 'Chocolate Topping', quantity: 1000, unit: 'Gr', unitCost: 0.5, totalCost: 500 },
    ],
  },
  {
    id: 'r2', productId: 'p2', productName: 'Kopi Gula Aren', sellingPrice: 18000, version: 2, status: 'active',
    totalHPP: 6150,
    items: [
      { id: 'ri4', ingredientId: 'i4', ingredientName: 'Espresso Shot', quantity: 60, unit: 'Ml', unitCost: 3, totalCost: 180 },
      { id: 'ri5', ingredientId: 'i5', ingredientName: 'Caramel Syrup', quantity: 30, unit: 'Ml', unitCost: 2.5, totalCost: 75 },
      { id: 'ri6', ingredientId: 'i2', ingredientName: 'Premium Milk Base', quantity: 200, unit: 'Ml', unitCost: 1.2, totalCost: 240 },
    ],
  },
  {
    id: 'r3', productId: 'p3', productName: 'Premium Cheeseburger', sellingPrice: 75000, version: 1, status: 'active',
    totalHPP: 25400,
    items: [
      { id: 'ri7', ingredientId: 'i9', ingredientName: 'Beef Patty Premium', quantity: 1, unit: 'Pcs', unitCost: 18500, totalCost: 18500 },
      { id: 'ri8', ingredientId: 'i10', ingredientName: 'Burger Bun', quantity: 1, unit: 'Pcs', unitCost: 4500, totalCost: 4500 },
      { id: 'ri9', ingredientId: 'i11', ingredientName: 'Cheddar Cheese', quantity: 30, unit: 'Gr', unitCost: 1.8, totalCost: 54 },
    ],
  },
]

export function RecipesPage() {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(mockRecipes[0])
  const [recipes, setRecipes] = useState(mockRecipes)
  const [editItems, setEditItems] = useState<RecipeItem[]>(mockRecipes[0].items)

  const totalHPP = editItems.reduce((s, i) => s + i.totalCost, 0)
  const grossProfit = selectedRecipe.sellingPrice - totalHPP
  const foodCost = calculateFoodCostPercent(totalHPP, selectedRecipe.sellingPrice)
  const margin = calculateMargin(totalHPP, selectedRecipe.sellingPrice)

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setEditItems([...recipe.items])
  }

  const handleAddItem = () => {
    const ingredient = ingredients[0]
    const newItem: RecipeItem = {
      id: `ri${Date.now()}`,
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      quantity: 1,
      unit: ingredient.unit,
      unitCost: ingredient.costPerUnit,
      totalCost: ingredient.costPerUnit,
    }
    setEditItems(prev => [...prev, newItem])
  }

  const handleRemoveItem = (id: string) => {
    setEditItems(prev => prev.filter(i => i.id !== id))
  }

  const handleUpdateItem = (id: string, field: keyof RecipeItem, value: string | number) => {
    setEditItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unitCost') {
        updated.totalCost = updated.quantity * updated.unitCost
      }
      if (field === 'ingredientId') {
        const ing = ingredients.find(i => i.id === value)
        if (ing) {
          updated.ingredientName = ing.name
          updated.unit = ing.unit
          updated.unitCost = ing.costPerUnit
          updated.totalCost = updated.quantity * ing.costPerUnit
        }
      }
      return updated
    }))
  }

  const handleSave = () => {
    setRecipes(prev => prev.map(r =>
      r.id === selectedRecipe.id ? { ...r, items: editItems, totalHPP } : r
    ))
    toast.success('Recipe saved successfully')
  }

  return (
    <div className="flex flex-col">
      <TopBar
        title="Recipe Builder"
        subtitle="Manage ingredients, calculate HPP, and set your profit margins"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Import CSV</Button>
            <Button size="sm"><Plus className="w-3.5 h-3.5" /> Create Product</Button>
          </div>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">
          <div className="col-span-4 flex flex-col">
            <Card className="flex-1 overflow-hidden">
              <CardHeader className="pb-2 bg-muted/30 border-b border-border">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Active Products</p>
                  <Badge variant="info">{recipes.length} Total</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-2 overflow-y-auto">
                {recipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => handleSelectRecipe(recipe)}
                    className={`w-full p-3 rounded-xl mb-1.5 text-left transition-all hover:bg-muted ${
                      selectedRecipe.id === recipe.id ? 'bg-accent border border-primary/20' : 'border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                        {recipe.productName.includes('Burger') ? '🍔' : recipe.productName.includes('Kopi') ? '☕' : '🍧'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{recipe.productName}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs font-bold text-primary tabular-nums">{formatCurrency(recipe.sellingPrice)}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">HPP: {formatCurrency(recipe.totalHPP)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="col-span-8 flex flex-col gap-4 overflow-y-auto">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-6 rounded-full bg-primary" />
                      <CardTitle className="text-xl">{selectedRecipe.productName}</CardTitle>
                      <Badge variant={selectedRecipe.status === 'active' ? 'success' : 'muted'} className="capitalize">
                        {selectedRecipe.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground ml-5 mt-0.5">Version {selectedRecipe.version} • Editing Master Recipe</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Total HPP</p>
                        <p className="text-2xl font-black text-primary tabular-nums">{formatCurrency(totalHPP)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Margin</p>
                        <p className="text-2xl font-black text-success tabular-nums">{formatPercent(margin)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Ingredients</p>
                      <Button size="sm" variant="outline" onClick={handleAddItem}>
                        <Plus className="w-3.5 h-3.5" /> Add Item
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {editItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg">
                          <Select
                            value={item.ingredientId}
                            onValueChange={(v) => handleUpdateItem(item.id, 'ingredientId', v)}
                          >
                            <SelectTrigger className="flex-1 h-7 text-xs border-0 bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ingredients.map(i => <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-16 h-7 text-xs text-center px-1 border-0 bg-background"
                          />
                          <span className="text-xs text-muted-foreground w-8 text-center shrink-0">{item.unit}</span>
                          <span className="text-xs font-semibold text-primary w-20 text-right tabular-nums shrink-0">{formatCurrency(item.totalCost)}</span>
                          <button onClick={() => handleRemoveItem(item.id)} className="text-destructive/60 hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 bg-muted/40 rounded-xl">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Pricing Strategy</p>
                      <Label className="text-xs">Harga Jual (Selling Price)</Label>
                      <Input
                        type="number"
                        value={selectedRecipe.sellingPrice}
                        className="mt-1 font-bold text-base"
                        readOnly
                      />
                      <Separator className="my-3" />
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Gross Profit</span>
                          <span className="font-bold text-success tabular-nums">{formatCurrency(grossProfit)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Food Cost %</span>
                          <span className={`font-bold tabular-nums ${foodCost > 35 ? 'text-destructive' : foodCost > 30 ? 'text-warning' : 'text-success'}`}>
                            {formatPercent(foodCost)}
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={foodCost}
                        className={`mt-3 h-2 ${foodCost > 35 ? '[&>div]:bg-destructive' : foodCost > 30 ? '[&>div]:bg-warning' : ''}`}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {foodCost <= 30 ? '✅ Food cost is within target (≤30%)' :
                         foodCost <= 35 ? '⚠️ Food cost is slightly above target' :
                         '❌ Food cost exceeds 35% — review recipe'}
                      </p>
                    </div>

                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Calculator className="w-4 h-4 text-primary" />
                        <p className="text-xs font-bold text-primary">HPP Breakdown</p>
                      </div>
                      {editItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs py-1 border-b border-border last:border-0">
                          <span className="text-muted-foreground">{item.ingredientName} ({item.quantity} {item.unit})</span>
                          <span className="font-semibold tabular-nums">{formatCurrency(item.totalCost)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold pt-2 mt-1 border-t border-border">
                        <span>Total HPP</span>
                        <span className="text-primary tabular-nums">{formatCurrency(totalHPP)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                  <Button variant="outline" size="sm">Discard Changes</Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-3.5 h-3.5" /> Save Recipe
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Ingredient Price Trend</p>
                  <div className="flex gap-1 items-end h-16 mb-2">
                    {[40, 55, 48, 62, 58, 72, 85].map((h, i) => (
                      <div key={i} className={`flex-1 rounded-t transition-all ${i === 6 ? 'bg-primary' : 'bg-primary/30'}`} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Milk prices increased by <span className="text-destructive font-bold">12%</span> this week. Consider adjusting your stock volume.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-foreground text-background">
                <CardContent className="p-4">
                  <p className="text-xs font-bold opacity-60 uppercase tracking-wide mb-2">Quick Summary</p>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-4xl font-black">{editItems.length}</p>
                      <p className="text-xs opacity-60">Active Ingredients</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-primary">{formatCurrency(totalHPP).replace('Rp', 'Rp\n')}</p>
                      <p className="text-xs opacity-60">Average HPP</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
