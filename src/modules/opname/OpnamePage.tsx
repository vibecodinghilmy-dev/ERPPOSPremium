import { useState } from 'react'
import { Plus, Save, CheckCircle, AlertTriangle, ClipboardList } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface OpnameItem {
  id: string
  ingredient: string
  category: string
  systemStock: number
  physicalStock: number | null
  unit: string
  unitCost: number
}

const mockOpname: OpnameItem[] = [
  { id: 'o1', ingredient: 'Susu Full Cream', category: 'Dairy', systemStock: 2.5, physicalStock: null, unit: 'Liter', unitCost: 16500 },
  { id: 'o2', ingredient: 'Espresso Roast', category: 'Coffee', systemStock: 1.2, physicalStock: null, unit: 'Kg', unitCost: 145000 },
  { id: 'o3', ingredient: 'Minyak Goreng', category: 'Bahan Pokok', systemStock: 145, physicalStock: null, unit: 'Liter', unitCost: 14500 },
  { id: 'o4', ingredient: 'Gula Pasir', category: 'Bahan Pokok', systemStock: 42, physicalStock: null, unit: 'Kg', unitCost: 16000 },
  { id: 'o5', ingredient: 'Tepung Terigu', category: 'Bahan Pokok', systemStock: 75, physicalStock: null, unit: 'Kg', unitCost: 12800 },
  { id: 'o6', ingredient: 'Beef Patty', category: 'Meat', systemStock: 8, physicalStock: null, unit: 'Pcs', unitCost: 18500 },
]

export function OpnamePage() {
  const [items, setItems] = useState(mockOpname)
  const [submitted, setSubmitted] = useState(false)

  const updatePhysical = (id: string, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, physicalStock: value === '' ? null : parseFloat(value) } : i))
  }

  const counted = items.filter(i => i.physicalStock !== null)
  const discrepancies = items.filter(i => i.physicalStock !== null && i.physicalStock !== i.systemStock)
  const totalDiscrepancyValue = discrepancies.reduce((s, i) => {
    const diff = (i.physicalStock ?? 0) - i.systemStock
    return s + diff * i.unitCost
  }, 0)

  const handleSubmit = () => {
    const allCounted = items.every(i => i.physicalStock !== null)
    if (!allCounted) { toast.error('Please count all items before submitting'); return }
    setSubmitted(true)
    toast.success('Stock opname submitted for approval')
  }

  return (
    <div className="flex flex-col">
      <TopBar
        title="Stock Opname"
        subtitle="Physical stock count and reconciliation"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><ClipboardList className="w-3.5 h-3.5" /> View History</Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitted}>
              <CheckCircle className="w-3.5 h-3.5" /> Submit Opname
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Total Items</p>
            <p className="text-2xl font-black mt-1">{items.length}</p>
          </CardContent></Card>
          <Card className="border-success/30"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Counted</p>
            <p className="text-2xl font-black text-success mt-1">{counted.length}/{items.length}</p>
          </CardContent></Card>
          <Card className={discrepancies.length > 0 ? 'border-warning/30' : ''}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Discrepancies</p>
            <p className={`text-2xl font-black mt-1 ${discrepancies.length > 0 ? 'text-warning' : 'text-success'}`}>{discrepancies.length}</p>
          </CardContent></Card>
          <Card className={totalDiscrepancyValue < 0 ? 'border-destructive/30' : 'border-success/30'}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Value Difference</p>
            <p className={`text-2xl font-black mt-1 tabular-nums ${totalDiscrepancyValue < 0 ? 'text-destructive' : 'text-success'}`}>
              {totalDiscrepancyValue >= 0 ? '+' : ''}{formatCurrency(totalDiscrepancyValue)}
            </p>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Count Sheet — {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</CardTitle>
              <Badge variant={counted.length === items.length ? 'success' : 'warning'}>
                {counted.length === items.length ? 'Complete' : `${items.length - counted.length} remaining`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ingredient</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">System Stock</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Physical Count</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Difference</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Value Impact</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const diff = item.physicalStock !== null ? item.physicalStock - item.systemStock : null
                  const valueImpact = diff !== null ? diff * item.unitCost : null
                  return (
                    <tr key={item.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <p className="font-medium">{item.ingredient}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold tabular-nums">{item.systemStock} {item.unit}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Enter count"
                            value={item.physicalStock ?? ''}
                            onChange={(e) => updatePhysical(item.id, e.target.value)}
                            className="w-28 h-8 text-sm"
                            disabled={submitted}
                          />
                          <span className="text-xs text-muted-foreground">{item.unit}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {diff !== null ? (
                          <span className={`font-bold tabular-nums ${diff < 0 ? 'text-destructive' : diff > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                            {diff > 0 ? '+' : ''}{diff} {item.unit}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not counted</span>
                        )}
                      </td>
                      <td className="p-4">
                        {valueImpact !== null ? (
                          <span className={`font-bold text-sm tabular-nums ${valueImpact < 0 ? 'text-destructive' : valueImpact > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                            {valueImpact >= 0 ? '+' : ''}{formatCurrency(valueImpact)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {discrepancies.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <p className="font-semibold text-sm">Discrepancies Detected</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {discrepancies.length} item(s) have differences between system stock and physical count.
                Submitting will create adjustment entries and update inventory records.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
