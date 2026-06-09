import { useState } from 'react'
import { Plus, Search, Download, RefreshCw, History, Edit, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EnterpriseDataTable, type Column } from '@/components/shared/EnterpriseDataTable'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Ingredient {
  id: string
  name: string
  category: string
  stock: number
  minStock: number
  unit: string
  purchasePrice: number
  supplier: string
  status: 'critical' | 'low' | 'normal' | 'excess'
}

const mockIngredients: Ingredient[] = [
  { id: '1', name: 'Telur Ayam Boiler', category: 'Daging & Protein', stock: 12, minStock: 30, unit: 'Butir', purchasePrice: 2100, supplier: 'IndoFarm Mandiri', status: 'critical' },
  { id: '2', name: 'Minyak Goreng Sawit', category: 'Bahan Pokok', stock: 145, minStock: 50, unit: 'Liter', purchasePrice: 14500, supplier: 'Distribusi Sembako Jaya', status: 'normal' },
  { id: '3', name: 'Bawang Putih Kating', category: 'Bumbu', stock: 5.4, minStock: 10, unit: 'Kg', purchasePrice: 38000, supplier: 'Pasar Induk Kramat', status: 'low' },
  { id: '4', name: 'Heavy Cream 35%', category: 'Dairy', stock: 0, minStock: 4, unit: 'Pack (1L)', purchasePrice: 82000, supplier: 'Diamond Cold Storage', status: 'critical' },
  { id: '5', name: 'Tepung Terigu Pro Tinggi', category: 'Bahan Pokok', stock: 75, minStock: 20, unit: 'Kg', purchasePrice: 12800, supplier: 'Bogasari Official', status: 'normal' },
  { id: '6', name: 'Susu Full Cream (Diamond)', category: 'Dairy', stock: 2.5, minStock: 10, unit: 'Liter', purchasePrice: 16500, supplier: 'Diamond Cold Storage', status: 'critical' },
  { id: '7', name: 'Espresso Roast (Arabica)', category: 'Coffee', stock: 1.2, minStock: 5, unit: 'Kg', purchasePrice: 145000, supplier: 'Kopitiam Roastery', status: 'critical' },
  { id: '8', name: 'Caramel Syrup (Monin)', category: 'Syrup', stock: 1, minStock: 5, unit: 'Bottle', purchasePrice: 125000, supplier: 'FoodPro Distributor', status: 'critical' },
  { id: '9', name: 'Beef Patty Premium', category: 'Meat', stock: 8, minStock: 50, unit: 'Pcs', purchasePrice: 18500, supplier: 'Fresh Farms Dairy', status: 'low' },
  { id: '10', name: 'Cooking Oil', category: 'Bahan Pokok', stock: 5, minStock: 10, unit: 'Liter', purchasePrice: 14000, supplier: 'Distribusi Sembako Jaya', status: 'low' },
  { id: '11', name: 'Gula Pasir', category: 'Bahan Pokok', stock: 42, minStock: 20, unit: 'Kg', purchasePrice: 16000, supplier: 'Pasar Induk Kramat', status: 'normal' },
  { id: '12', name: 'Salmon Fillet', category: 'Seafood', stock: 3.5, minStock: 5, unit: 'Kg', purchasePrice: 185000, supplier: 'Fresh Fish Market', status: 'low' },
]

function getStatusBadge(status: Ingredient['status'], stock: number) {
  if (stock === 0) return <Badge variant="destructive">HABIS</Badge>
  if (status === 'critical') return <Badge variant="destructive">Stok Kritis</Badge>
  if (status === 'low') return <Badge variant="warning">Batas Aman</Badge>
  if (status === 'excess') return <Badge variant="info">Surplus</Badge>
  return <Badge variant="success">Normal</Badge>
}

export function InventoryPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', category: '', unit: '', stock: '', minStock: '', purchasePrice: '', supplier: '' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const categories = [...new Set(mockIngredients.map(i => i.category))]
  const totalValue = mockIngredients.reduce((sum, i) => sum + i.stock * i.purchasePrice, 0)
  const lowStockCount = mockIngredients.filter(i => i.status === 'critical' || i.stock === 0).length

  const filtered = mockIngredients.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter
    const matchStatus = statusFilter === 'all' || item.status === statusFilter || (statusFilter === 'empty' && item.stock === 0)
    return matchSearch && matchCat && matchStatus
  })

  const columns: Column<Ingredient>[] = [
    {
      key: 'name',
      header: 'Nama Bahan',
      searchable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm">
            📦
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.supplier}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Kategori',
      cell: (row) => <Badge variant="muted" className="text-xs">{row.category}</Badge>,
    },
    {
      key: 'stock',
      header: 'Stok Saat Ini',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <div className="text-right">
            <span className={cn(
              'font-bold text-sm tabular-nums',
              row.stock === 0 ? 'text-destructive' :
              row.status === 'critical' ? 'text-destructive' :
              row.status === 'low' ? 'text-warning' : 'text-foreground'
            )}>{row.stock}</span>
            <span className="text-xs text-muted-foreground ml-1">{row.unit}</span>
          </div>
          <Progress
            value={Math.min((row.stock / row.minStock) * 100, 100)}
            className="h-1.5 w-16"
          />
        </div>
      ),
    },
    {
      key: 'minStock',
      header: 'Batas Min',
      align: 'right',
      cell: (row) => <span className="text-sm tabular-nums">{row.minStock} {row.unit}</span>,
    },
    {
      key: 'purchasePrice',
      header: 'Harga Beli',
      align: 'right',
      cell: (row) => <span className="text-sm tabular-nums">{formatCurrency(row.purchasePrice)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => getStatusBadge(row.status, row.stock),
    },
  ]

  const handleAddItem = () => {
    if (!newItem.name || !newItem.unit) { toast.error('Please fill required fields'); return }
    toast.success(`${newItem.name} added to inventory`)
    setShowAddDialog(false)
    setNewItem({ name: '', category: '', unit: '', stock: '', minStock: '', purchasePrice: '', supplier: '' })
  }

  const handleBulkRestock = (rows: Ingredient[]) => {
    toast.success(`Restock request for ${rows.length} items sent to purchasing`)
    setSelectedIds(new Set())
  }

  return (
    <div className="flex flex-col">
      <TopBar
        title="Ingredient & Inventory"
        subtitle="Monitor and manage your restaurant supply chain"
        onSearch={() => navigate('/')} // Command palette opens via Cmd+K
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> Export</Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}><Plus className="w-3.5 h-3.5" /> Tambah Bahan</Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold tracking-wide">Total Ingredients</p>
            <p className="text-2xl font-black mt-1">{mockIngredients.length} Items</p>
          </CardContent></Card>
          <Card className="border-destructive/30 bg-destructive/5"><CardContent className="p-4">
            <p className="text-xs text-destructive/70 font-semibold tracking-wide">Low Stock Warning</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-black text-destructive">{lowStockCount} Items</p>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold tracking-wide">Categories</p>
            <p className="text-2xl font-black mt-1">{categories.length} Groups</p>
          </CardContent></Card>
          <Card className="bg-primary text-primary-foreground border-0"><CardContent className="p-4">
            <p className="text-xs opacity-70 font-semibold tracking-wide">Stock Value</p>
            <p className="text-2xl font-black mt-1 tabular-nums">{formatCurrency(totalValue)}</p>
          </CardContent></Card>
        </div>

        {/* Enterprise DataTable */}
        <EnterpriseDataTable
          columns={columns}
          data={filtered}
          searchable
          searchPlaceholder="Quick find by name or supplier..."
          sortable
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          getId={(row) => row.id}
          columnVisibility
          exportable
          exportFileName="inventory-export"
          pageSize={10}
          pageSizeOptions={[5, 10, 20, 50]}
          emptyTitle="No ingredients found"
          emptyDescription="Try adjusting your search or filters"
          actions={[
            {
              label: 'Restock Selected',
              icon: <RefreshCw className="w-3.5 h-3.5" />,
              onClick: handleBulkRestock,
              variant: 'default',
            },
          ]}
        />

        {/* Restock Suggestions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <h3 className="font-semibold text-sm mb-1">📊 Optimize Your Purchasing</h3>
              <p className="text-sm text-muted-foreground mb-3">Our algorithm suggests restocking {lowStockCount} items today to avoid service disruption tomorrow.</p>
              <Button size="sm" onClick={() => navigate('/purchases')}>Review Suggestions</Button>
            </CardContent>
          </Card>
          <Card className="bg-primary text-primary-foreground border-0">
            <CardContent className="p-5">
              <p className="text-xs font-semibold opacity-70 tracking-wide">Monthly Inventory Accuracy</p>
              <p className="text-3xl font-black mt-1">98.4%</p>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <span className="opacity-70">Target: 99%</span>
                <span className="font-semibold">+2.1% from Last Month</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Bahan Baku</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { key: 'name', label: 'Nama Bahan *', placeholder: 'e.g. Susu Full Cream' },
              { key: 'category', label: 'Kategori', placeholder: 'e.g. Dairy' },
              { key: 'unit', label: 'Satuan *', placeholder: 'e.g. Liter, Kg, Pcs' },
              { key: 'stock', label: 'Stok Awal', placeholder: '0', type: 'number' },
              { key: 'minStock', label: 'Batas Minimum', placeholder: '0', type: 'number' },
              { key: 'purchasePrice', label: 'Harga Beli (Rp)', placeholder: '0', type: 'number' },
              { key: 'supplier', label: 'Supplier', placeholder: 'Supplier name' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input
                  type={type || 'text'}
                  placeholder={placeholder}
                  value={newItem[key as keyof typeof newItem]}
                  onChange={(e) => setNewItem(prev => ({ ...prev, [key]: e.target.value }))}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddItem}>Add Ingredient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}