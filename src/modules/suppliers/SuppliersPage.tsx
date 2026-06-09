import { useState } from 'react'
import { Plus, Search, Phone, Mail, Star } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

const suppliers = [
  { id: 's1', name: 'Fresh Farms Dairy', category: 'Dairy & Eggs', phone: '+62 21-555-0101', email: 'procurement@freshfarms.co.id', address: 'Jl. Industri No. 45, Bekasi', score: 98, totalOrders: 45, totalSpend: 28500000, isActive: true },
  { id: 's2', name: 'Artisan Flour Mills', category: 'Dry Goods', phone: '+62 21-555-0202', email: 'sales@artisanflour.id', address: 'Kawasan Industri MM2100, Cikarang', score: 95, totalOrders: 32, totalSpend: 15200000, isActive: true },
  { id: 's3', name: 'Metro Meat Co.', category: 'Meat & Poultry', phone: '+62 21-555-0303', email: 'orders@metromeat.co.id', address: 'Pasar Besar, Jakarta Pusat', score: 92, totalOrders: 28, totalSpend: 42800000, isActive: true },
  { id: 's4', name: 'Diamond Cold Storage', category: 'Dairy & Cold Chain', phone: '+62 21-555-0404', email: 'b2b@diamond.co.id', address: 'Jl. Raya Bogor KM 29, Depok', score: 89, totalOrders: 19, totalSpend: 35600000, isActive: true },
  { id: 's5', name: 'Kopitiam Roastery', category: 'Coffee & Tea', phone: '+62 21-555-0505', email: 'wholesale@kopitiam.id', address: 'Jl. Melawai VII, Blok M, Jakarta', score: 97, totalOrders: 22, totalSpend: 18900000, isActive: true },
  { id: 's6', name: 'IndoFarm Mandiri', category: 'Vegetables & Herbs', phone: '+62 21-555-0606', email: 'supply@indofarm.co.id', address: 'Pasar Induk Kramat Jati, Jakarta', score: 85, totalOrders: 38, totalSpend: 12400000, isActive: false },
]

export function SuppliersPage() {
  const [search, setSearch] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', email: '', address: '', category: '', notes: '' })

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleAddSupplier = () => {
    if (!newSupplier.name) { toast.error('Supplier name required'); return }
    toast.success(`${newSupplier.name} added to suppliers`)
    setShowAddDialog(false)
    setNewSupplier({ name: '', phone: '', email: '', address: '', category: '', notes: '' })
  }

  return (
    <div className="flex flex-col">
      <TopBar
        title="Suppliers"
        subtitle={`${suppliers.filter(s => s.isActive).length} active suppliers`}
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Supplier
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((supplier) => (
            <Card key={supplier.id} className={`hover:shadow-md transition-all ${!supplier.isActive ? 'opacity-60' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-black text-primary">
                      {supplier.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{supplier.name}</p>
                      <Badge variant="muted" className="text-[10px] mt-0.5">{supplier.category}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-warning text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-warning" />
                    {supplier.score}
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>{supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                    <p className="text-sm font-bold">{supplier.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Spend</p>
                    <p className="text-sm font-bold tabular-nums">{formatCurrency(supplier.totalSpend)}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs">View Profile</Button>
                  <Button size="sm" className="flex-1 h-7 text-xs">Create PO</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Supplier</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'name', label: 'Supplier Name *', placeholder: 'Company name', span: 2 },
              { key: 'category', label: 'Category', placeholder: 'e.g. Dairy & Eggs' },
              { key: 'phone', label: 'Phone', placeholder: '+62...' },
              { key: 'email', label: 'Email', placeholder: 'email@company.com' },
              { key: 'address', label: 'Address', placeholder: 'Full address' },
              { key: 'notes', label: 'Notes', placeholder: 'Additional notes' },
            ].map(({ key, label, placeholder, span }) => (
              <div key={key} className={span === 2 ? 'col-span-2' : ''}>
                <Label className="text-xs">{label}</Label>
                <Input
                  placeholder={placeholder}
                  value={newSupplier[key as keyof typeof newSupplier]}
                  onChange={(e) => setNewSupplier(prev => ({ ...prev, [key]: e.target.value }))}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSupplier}>Add Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
