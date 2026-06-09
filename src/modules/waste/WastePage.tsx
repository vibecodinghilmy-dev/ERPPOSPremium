import { useState } from 'react'
import { Plus, AlertTriangle, CheckCircle, XCircle, Clock, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EnterpriseDataTable, type Column } from '@/components/shared/EnterpriseDataTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface WasteLog {
  id: string
  ingredient: string
  category: string
  quantity: number
  unit: string
  unitCost: number
  totalCost: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdBy: string
  createdAt: string
}

const mockWastes: WasteLog[] = [
  { id: 'w1', ingredient: 'Susu Full Cream', category: 'Dairy', quantity: 2, unit: 'Liter', unitCost: 16500, totalCost: 33000, reason: 'Expired - past use-by date', status: 'approved', createdBy: 'Alex Morgan', createdAt: '2024-10-24T14:30:00Z' },
  { id: 'w2', ingredient: 'Heavy Cream 35%', category: 'Dairy', quantity: 1, unit: 'Pack (1L)', unitCost: 82000, totalCost: 82000, reason: 'Spoiled - temperature breach', status: 'pending', createdBy: 'Alex Morgan', createdAt: '2024-10-24T10:15:00Z' },
  { id: 'w3', ingredient: 'Cup 16oz', category: 'Packaging', quantity: 25, unit: 'Pcs', unitCost: 1200, totalCost: 30000, reason: 'Broken - dropped shipment', status: 'approved', createdBy: 'Sarah K.', createdAt: '2024-10-23T16:45:00Z' },
  { id: 'w4', ingredient: 'Caramel Syrup', category: 'Syrup', quantity: 0.5, unit: 'Bottle', unitCost: 125000, totalCost: 62500, reason: 'Spilled during prep', status: 'pending', createdBy: 'Alex Morgan', createdAt: '2024-10-23T09:20:00Z' },
  { id: 'w5', ingredient: 'Beef Patty', category: 'Meat', quantity: 3, unit: 'Pcs', unitCost: 18500, totalCost: 55500, reason: 'Overcooked / rejected by QC', status: 'rejected', createdBy: 'Chef Budi', createdAt: '2024-10-22T18:30:00Z' },
]

const statusConfig = {
  pending: { label: 'Pending', variant: 'warning' as const, icon: Clock },
  approved: { label: 'Approved', variant: 'success' as const, icon: CheckCircle },
  rejected: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
}

export function WastePage() {
  const navigate = useNavigate()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newWaste, setNewWaste] = useState({ ingredient: '', quantity: '', unit: 'Kg', reason: '' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const totalCost = mockWastes.filter(w => w.status === 'approved').reduce((s, w) => s + w.totalCost, 0)
  const pendingCount = mockWastes.filter(w => w.status === 'pending').length
  const wastePercent = (totalCost / 14250000 * 100).toFixed(1)

  const columns: Column<WasteLog>[] = [
    {
      key: 'ingredient',
      header: 'Ingredient',
      searchable: true,
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.ingredient}</p>
          <p className="text-xs text-muted-foreground">{row.category}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      cell: (row) => <span className="text-sm tabular-nums font-semibold text-destructive">{row.quantity} {row.unit}</span>,
    },
    { key: 'reason', header: 'Reason', cell: (row) => <span className="text-sm text-muted-foreground">{row.reason}</span> },
    {
      key: 'totalCost',
      header: 'Cost Impact',
      align: 'right',
      cell: (row) => <span className="font-bold text-destructive text-sm tabular-nums">-{formatCurrency(row.totalCost)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const config = statusConfig[row.status]
        return <Badge variant={config.variant}>{config.label}</Badge>
      },
    },
    {
      key: 'createdBy',
      header: 'Reported By',
      cell: (row) => <span className="text-sm text-muted-foreground">{row.createdBy}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      cell: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => row.status === 'pending' ? (
        <div className="flex gap-1">
          <Button size="sm" className="h-7 text-xs" variant="success" onClick={() => toast.success('Waste log approved')}>
            <CheckCircle className="w-3 h-3" /> Approve
          </Button>
          <Button size="sm" className="h-7 text-xs" variant="destructive" onClick={() => toast.error('Waste log rejected')}>
            <XCircle className="w-3 h-3" />
          </Button>
        </div>
      ) : null,
    },
  ]

  const handleBulkApprove = (rows: WasteLog[]) => {
    toast.success(`${rows.length} waste logs approved`)
    setSelectedIds(new Set())
  }

  return (
    <div className="flex flex-col">
      <TopBar
        title="Waste Management"
        subtitle="Track and manage inventory losses"
        onSearch={() => navigate('/')}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> Export</Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-3.5 h-3.5" /> Log Waste
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-destructive/30"><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="text-xs text-muted-foreground font-semibold uppercase">Total Waste Cost</p>
            </div>
            <p className="text-2xl font-black text-destructive tabular-nums">{formatCurrency(totalCost)}</p>
            <p className="text-xs text-muted-foreground mt-1">This week (approved)</p>
          </CardContent></Card>
          <Card className="border-warning/30"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Pending Approval</p>
            <p className="text-2xl font-black text-warning mt-1">{pendingCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Requires manager review</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Waste Events</p>
            <p className="text-2xl font-black mt-1">{mockWastes.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total logs this month</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase">% of Revenue</p>
            <p className="text-2xl font-black mt-1">{wastePercent}%</p>
            <p className="text-xs text-success mt-1 font-semibold">↓ Below 2% target</p>
          </CardContent></Card>
        </div>

        <EnterpriseDataTable
          columns={columns}
          data={mockWastes}
          searchable
          searchPlaceholder="Search waste logs..."
          sortable
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          getId={(row) => row.id}
          columnVisibility
          exportable
          exportFileName="waste-logs"
          pageSize={10}
          emptyTitle="No waste logs found"
          emptyDescription="Log new waste items using the button above"
          actions={[
            {
              label: 'Approve Selected',
              icon: <CheckCircle className="w-3.5 h-3.5" />,
              onClick: handleBulkApprove,
              variant: 'default',
            },
          ]}
        />
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Waste Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Ingredient / Item *</Label>
              <Input placeholder="e.g. Susu Full Cream" value={newWaste.ingredient} onChange={(e) => setNewWaste(p => ({ ...p, ingredient: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quantity *</Label>
                <Input type="number" placeholder="0" value={newWaste.quantity} onChange={(e) => setNewWaste(p => ({ ...p, quantity: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Unit</Label>
                <Select value={newWaste.unit} onValueChange={(v) => setNewWaste(p => ({ ...p, unit: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Kg', 'Gr', 'Liter', 'Ml', 'Pcs', 'Bottle', 'Pack'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Reason *</Label>
              <Input placeholder="e.g. Expired, Spilled, Broken..." value={newWaste.reason} onChange={(e) => setNewWaste(p => ({ ...p, reason: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { toast.success('Waste log submitted for approval'); setShowAddDialog(false) }}>Submit for Approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}