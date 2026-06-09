import { useState } from 'react'
import { Plus, Search, Download, Eye, CheckCircle, Clock, Truck, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EnterpriseDataTable, type Column } from '@/components/shared/EnterpriseDataTable'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface PurchaseOrder {
  id: string
  poNumber: string
  supplier: string
  orderDate: string
  expectedDate: string
  totalAmount: number
  status: 'draft' | 'pending' | 'approved' | 'received' | 'cancelled'
  itemCount: number
}

const mockPOs: PurchaseOrder[] = [
  { id: 'po1', poNumber: '#PO-24901', supplier: 'Fresh Farms Dairy', orderDate: '2024-10-24', expectedDate: '2024-10-26', totalAmount: 1240500, status: 'approved', itemCount: 5 },
  { id: 'po2', poNumber: '#PO-24902', supplier: 'Artisan Flour Mills', orderDate: '2024-10-25', expectedDate: '2024-10-27', totalAmount: 850000, status: 'pending', itemCount: 3 },
  { id: 'po3', poNumber: '#PO-24898', supplier: 'Vintage Spirits & Wine', orderDate: '2024-10-22', expectedDate: '2024-10-23', totalAmount: 4620000, status: 'received', itemCount: 8 },
  { id: 'po4', poNumber: '#PO-24897', supplier: 'Metro Meat Co.', orderDate: '2024-10-22', expectedDate: '2024-10-24', totalAmount: 2100250, status: 'received', itemCount: 6 },
  { id: 'po5', poNumber: '#PO-24895', supplier: 'IndoFarm Mandiri', orderDate: '2024-10-21', expectedDate: '2024-10-23', totalAmount: 560000, status: 'cancelled', itemCount: 2 },
  { id: 'po6', poNumber: '#PO-24903', supplier: 'Diamond Cold Storage', orderDate: '2024-10-25', expectedDate: '2024-10-28', totalAmount: 3450000, status: 'draft', itemCount: 4 },
]

const statusConfig = {
  draft: { label: 'Draft', variant: 'muted' as const, icon: Clock },
  pending: { label: 'Pending', variant: 'warning' as const, icon: Clock },
  approved: { label: 'Approved', variant: 'info' as const, icon: CheckCircle },
  received: { label: 'Received', variant: 'success' as const, icon: Truck },
  cancelled: { label: 'Cancelled', variant: 'destructive' as const, icon: XCircle },
}

const suppliers = [
  { name: 'Fresh Farms Dairy', category: 'Dairy & Eggs', score: 98, orders: 45, onTime: 98 },
  { name: 'Artisan Flour Mills', category: 'Dry Goods', score: 95, orders: 32, onTime: 96 },
  { name: 'Metro Meat Co.', category: 'Meat & Poultry', score: 92, orders: 28, onTime: 94 },
  { name: 'Diamond Cold Storage', category: 'Cold Storage', score: 89, orders: 19, onTime: 89 },
  { name: 'Kopitiam Roastery', category: 'Coffee & Tea', score: 97, orders: 22, onTime: 97 },
]

export function PurchasesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('orders')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filtered = mockPOs.filter(po =>
    po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
    po.supplier.toLowerCase().includes(search.toLowerCase())
  )

  const totalSpend = mockPOs.filter(po => po.status !== 'cancelled').reduce((s, po) => s + po.totalAmount, 0)
  const pendingCount = mockPOs.filter(po => po.status === 'pending').length
  const pendingValue = mockPOs.filter(po => po.status === 'pending').reduce((s, po) => s + po.totalAmount, 0)

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'poNumber',
      header: 'PO ID',
      searchable: true,
      cell: (row) => <span className="font-mono text-sm font-semibold text-primary">{row.poNumber}</span>,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      searchable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {row.supplier[0]}
          </div>
          <span className="font-medium text-sm">{row.supplier}</span>
        </div>
      ),
    },
    { key: 'orderDate', header: 'Order Date', cell: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.orderDate)}</span> },
    { key: 'expectedDate', header: 'Expected', cell: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.expectedDate)}</span> },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      align: 'right',
      cell: (row) => <span className="font-bold text-sm tabular-nums">{formatCurrency(row.totalAmount)}</span>,
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
      key: 'actions',
      header: 'Action',
      cell: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => toast.success(`Viewing ${row.poNumber}`)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          {row.status === 'pending' && (
            <Button size="sm" className="h-7 text-xs px-2" onClick={() => toast.success(`${row.poNumber} approved`)}>
              Approve
            </Button>
          )}
        </div>
      ),
    },
  ]

  const supplierColumns: Column<typeof suppliers[0]>[] = [
    { key: 'name', header: 'Supplier', searchable: true, cell: (row) => <span className="font-medium text-sm">{row.name}</span> },
    { key: 'category', header: 'Category', cell: (row) => <Badge variant="muted">{row.category}</Badge> },
    { key: 'orders', header: 'Total Orders', align: 'right', cell: (row) => <span className="text-sm tabular-nums">{row.orders}</span> },
    {
      key: 'onTime', header: 'On-Time %', align: 'right',
      cell: (row) => <span className={`text-sm font-bold tabular-nums ${row.onTime >= 95 ? 'text-success' : 'text-warning'}`}>{row.onTime}%</span>
    },
    {
      key: 'score', header: 'Score',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-12 h-1.5 bg-muted rounded-full">
            <div className="h-full bg-success rounded-full" style={{ width: `${row.score}%` }} />
          </div>
          <span className="text-xs font-bold">{row.score}</span>
        </div>
      )
    },
  ]

  const handleBulkApprove = (rows: PurchaseOrder[]) => {
    toast.success(`${rows.length} purchase orders approved`)
    setSelectedIds(new Set())
  }

  return (
    <div className="flex flex-col">
      <TopBar
        title="Purchasing & Supplier Management"
        subtitle="Streamline your procurement workflow and supplier relations"
        onSearch={() => navigate('/')}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            <Button size="sm"><Plus className="w-3.5 h-3.5" /> Create PO</Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold tracking-wide">Total Spend (Monthly)</p>
            <p className="text-2xl font-black mt-1 tabular-nums">{formatCurrency(totalSpend)}</p>
            <p className="text-xs text-success mt-1 font-semibold">↑ 12.5% vs last month</p>
          </CardContent></Card>
          <Card className="border-warning/30 bg-warning/5"><CardContent className="p-4">
            <p className="text-xs text-warning/70 font-semibold tracking-wide">Pending Approvals</p>
            <p className="text-2xl font-black text-warning mt-1">{pendingCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Total value: {formatCurrency(pendingValue)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold tracking-wide">Active Suppliers</p>
            <p className="text-2xl font-black mt-1">{suppliers.length}</p>
            <p className="text-xs text-muted-foreground mt-1">+2 on-boarding this week</p>
          </CardContent></Card>
          <Card className="bg-success/10 border-success/30"><CardContent className="p-4">
            <p className="text-xs text-success/70 font-semibold tracking-wide">Delivery Success</p>
            <p className="text-2xl font-black text-success mt-1">98.2%</p>
            <p className="text-xs text-success/70 mt-1">On-time rate stable</p>
          </CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="orders">Recent Purchase Orders</TabsTrigger>
              <TabsTrigger value="suppliers">Supplier Directory</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="orders">
            <EnterpriseDataTable
              columns={columns}
              data={filtered}
              searchable
              searchPlaceholder="Search purchase orders..."
              sortable
              selectable
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              getId={(row) => row.id}
              columnVisibility
              exportable
              exportFileName="purchase-orders"
              pageSize={10}
              emptyTitle="No purchase orders found"
              emptyDescription="Create a new purchase order to get started"
              actions={[
                {
                  label: 'Approve Selected',
                  icon: <CheckCircle className="w-3.5 h-3.5" />,
                  onClick: handleBulkApprove,
                  variant: 'default',
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="suppliers">
            <EnterpriseDataTable
              columns={supplierColumns}
              data={suppliers}
              searchable
              searchPlaceholder="Search suppliers..."
              sortable
              columnVisibility
              exportable
              exportFileName="suppliers"
              pageSize={10}
              emptyTitle="No suppliers found"
            />
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Spend Trend Analysis</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-1.5 items-end h-24 mb-2">
                  {[
                    { day: 'Mon', h: 45 }, { day: 'Tue', h: 62 }, { day: 'Wed', h: 55 },
                    { day: 'Thu', h: 80 }, { day: 'Fri', h: 72 }, { day: 'Sat', h: 58 }, { day: 'Sun', h: 35 }
                  ].map(({ day, h }, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-full rounded-t ${i === 3 ? 'bg-muted-foreground' : 'bg-primary'}`} style={{ height: `${h}%` }} />
                      <span className="text-[10px] text-muted-foreground">{day}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Alerts</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: '⚠️', title: 'Low Stock Alert', desc: 'Extra Virgin Olive Oil below threshold (5L left)', color: 'text-warning' },
                { icon: 'ℹ️', title: 'Supplier Update', desc: 'Metro Meat Co. added new seasonal lamb cuts', color: 'text-primary' },
                { icon: '❗', title: 'Delayed Delivery', desc: 'PO-24901 from Fresh Farms delayed by 4 hours', color: 'text-destructive' },
              ].map((alert, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="text-base shrink-0">{alert.icon}</span>
                  <div>
                    <p className={`font-semibold ${alert.color}`}>{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}