import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign, TrendingUp, ShoppingBag, AlertTriangle,
  BarChart3, Package, Flame, Target, RefreshCw, Download,
  Users, ClipboardList, Trash2, Store, TrendingDown,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { TopBar } from '@/components/layout/TopBar'
import { StatsCard } from '@/components/shared/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, formatNumber, formatPercent, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

// ─── Mock Data ─────────────────────────────────────────────────────

const revenueData = [
  { day: 'Mon', revenue: 12400000, profit: 4500000, hpp: 4960000 },
  { day: 'Tue', revenue: 15200000, profit: 5800000, hpp: 6080000 },
  { day: 'Wed', revenue: 11800000, profit: 4200000, hpp: 4720000 },
  { day: 'Thu', revenue: 18500000, profit: 7200000, hpp: 7400000 },
  { day: 'Fri', revenue: 22100000, profit: 9100000, hpp: 8840000 },
  { day: 'Sat', revenue: 19800000, profit: 7800000, hpp: 7920000 },
  { day: 'Sun', revenue: 14250000, profit: 5820000, hpp: 5700000 },
]

const topProducts = [
  { name: 'Iced Caramel Macchiato', sold: 42, revenue: 5880000, trend: 12 },
  { name: 'Double Cheese Burger', sold: 38, revenue: 6650000, trend: 8 },
  { name: 'Truffle Fries', sold: 31, revenue: 3410000, trend: -3 },
  { name: 'Matcha Latte', sold: 25, revenue: 2875000, trend: 15 },
  { name: 'Salmon Poke Bowl', sold: 22, revenue: 5720000, trend: 5 },
]

const categoryData = [
  { name: 'Beverages', value: 42, color: 'hsl(221, 100%, 39%)' },
  { name: 'Main Course', value: 28, color: 'hsl(24, 100%, 37%)' },
  { name: 'Desserts', value: 16, color: 'hsl(142, 71%, 45%)' },
  { name: 'Snacks', value: 14, color: 'hsl(38, 92%, 50%)' },
]

const lowStockItems = [
  { name: 'Susu Full Cream (Diamond)', category: 'Dairy', stock: 2.5, minStock: 10, unit: 'Liter', status: 'critical' },
  { name: 'Espresso Roast (Arabica)', category: 'Coffee Beans', stock: 1.2, minStock: 5, unit: 'Kg', status: 'critical' },
  { name: 'Heavy Cream 35%', category: 'Dairy', stock: 0, minStock: 4, unit: 'Pack (1L)', status: 'empty' },
  { name: 'Beef Patty (Premium)', category: 'Meat', stock: 8, minStock: 50, unit: 'Pcs', status: 'low' },
  { name: 'Caramel Syrup', category: 'Syrup', stock: 1, minStock: 5, unit: 'Bottle', status: 'critical' },
]

const smartAlerts = [
  { type: 'stock', msg: 'Susu Full Cream will run out in ~2 days at current rate', severity: 'high' as const },
  { type: 'price', msg: 'Coffee bean cost increased 15% — HPP recalculation needed', severity: 'medium' as const },
  { type: 'profit', msg: 'Net margin dropped to 27.3% — below 30% target', severity: 'medium' as const },
  { type: 'waste', msg: 'Waste cost this week: Rp 450,000 — review procedures', severity: 'low' as const },
]

// ─── KPI Drilldown Config ──────────────────────────────────────────

interface KPIDrilldown {
  path: string
  label: string
}

const kpiDrilldowns: Record<string, KPIDrilldown> = {
  revenue: { path: '/reports', label: 'View Sales Report →' },
  profit: { path: '/reports?tab=financial', label: 'View Profit Analysis →' },
  hpp: { path: '/recipes', label: 'View Recipe Costs →' },
  transactions: { path: '/pos', label: 'View POS →' },
  lowStock: { path: '/inventory?filter=critical', label: 'View Inventory →' },
  waste: { path: '/waste', label: 'View Waste Log →' },
  products: { path: '/products', label: 'View Products →' },
  purchases: { path: '/purchases', label: 'View Purchases →' },
  customers: { path: '/customers', label: 'View Customers →' },
}

// ─── Role Dashboard Config ──────────────────────────────────────────

type RoleConfig = {
  kpis: Array<{
    key: string
    title: string
    value: string
    change?: number
    changeLabel?: string
    icon: React.ReactNode
    iconBg: string
    drilldown: KPIDrilldown
  }>
  showRevenueChart?: boolean
  showTopProducts?: boolean
  showStockAlerts?: boolean
  showSmartAlerts?: boolean
  showCategoryPie?: boolean
}

function getRoleConfig(role: UserRole | undefined): RoleConfig {
  switch (role) {
    case 'cashier':
      return {
        kpis: [
          { key: 'transactions', title: 'Today\'s Transactions', value: '142', change: 4, changeLabel: 'vs yesterday', icon: <ShoppingBag className="w-4 h-4" />, iconBg: 'bg-accent text-primary', drilldown: kpiDrilldowns.transactions },
          { key: 'revenue', title: 'Revenue', value: formatCurrency(14250000), change: 12.5, changeLabel: 'vs yesterday', icon: <DollarSign className="w-4 h-4" />, iconBg: 'bg-primary/10 text-primary', drilldown: kpiDrilldowns.revenue },
          { key: 'products', title: 'Top Product', value: 'Iced Caramel', change: 15, changeLabel: '42 sold today', icon: <Package className="w-4 h-4" />, iconBg: 'bg-success/10 text-success', drilldown: kpiDrilldowns.products },
        ],
        showRevenueChart: true,
        showTopProducts: true,
        showStockAlerts: false,
        showSmartAlerts: false,
        showCategoryPie: false,
      }
    case 'warehouse':
      return {
        kpis: [
          { key: 'lowStock', title: 'Low Stock Items', value: '5', change: 2, changeLabel: 'need restock', icon: <AlertTriangle className="w-4 h-4" />, iconBg: 'bg-destructive/10 text-destructive', drilldown: kpiDrilldowns.lowStock },
          { key: 'hpp', title: 'Stock Value', value: formatCurrency(8430000), change: -2.1, changeLabel: 'total inventory', icon: <BarChart3 className="w-4 h-4" />, iconBg: 'bg-warning/10 text-warning', drilldown: kpiDrilldowns.hpp },
          { key: 'purchases', title: 'Pending Orders', value: '3', change: 0, changeLabel: 'awaiting delivery', icon: <Package className="w-4 h-4" />, iconBg: 'bg-primary/10 text-primary', drilldown: kpiDrilldowns.purchases },
        ],
        showRevenueChart: false,
        showTopProducts: false,
        showStockAlerts: true,
        showSmartAlerts: true,
        showCategoryPie: false,
      }
    case 'accounting':
      return {
        kpis: [
          { key: 'revenue', title: 'Revenue (MTD)', value: formatCurrency(124500000), change: 12.5, changeLabel: 'vs last month', icon: <DollarSign className="w-4 h-4" />, iconBg: 'bg-primary/10 text-primary', drilldown: kpiDrilldowns.revenue },
          { key: 'profit', title: 'Gross Profit', value: formatCurrency(5820000), change: 8.2, changeLabel: '40.8% margin', icon: <TrendingUp className="w-4 h-4" />, iconBg: 'bg-success/10 text-success', drilldown: kpiDrilldowns.profit },
          { key: 'hpp', title: 'Total COGS', value: formatCurrency(48200000), change: -2.1, changeLabel: 'food cost ratio', icon: <BarChart3 className="w-4 h-4" />, iconBg: 'bg-warning/10 text-warning', drilldown: kpiDrilldowns.hpp },
          { key: 'transactions', title: 'Avg Order Value', value: formatCurrency(102500), change: 4, changeLabel: 'Rp 100K target', icon: <ShoppingBag className="w-4 h-4" />, iconBg: 'bg-accent text-primary', drilldown: kpiDrilldowns.transactions },
        ],
        showRevenueChart: true,
        showTopProducts: false,
        showStockAlerts: false,
        showSmartAlerts: true,
        showCategoryPie: true,
      }
    default: // owner / manager / admin
      return {
        kpis: [
          { key: 'revenue', title: 'Revenue', value: formatCurrency(14250000), change: 12.5, changeLabel: 'vs yesterday', icon: <DollarSign className="w-4 h-4" />, iconBg: 'bg-primary/10 text-primary', drilldown: kpiDrilldowns.revenue },
          { key: 'profit', title: 'Gross Profit', value: formatCurrency(5820000), change: 8.2, changeLabel: '40.8% margin', icon: <TrendingUp className="w-4 h-4" />, iconBg: 'bg-success/10 text-success', drilldown: kpiDrilldowns.profit },
          { key: 'hpp', title: 'HPP (COGS)', value: formatCurrency(8430000), change: -2.1, changeLabel: '59.2% food cost', icon: <BarChart3 className="w-4 h-4" />, iconBg: 'bg-warning/10 text-warning', drilldown: kpiDrilldowns.hpp },
          { key: 'transactions', title: 'Transactions', value: '142', change: 4, changeLabel: `Avg ${formatCurrency(100352)}`, icon: <ShoppingBag className="w-4 h-4" />, iconBg: 'bg-accent text-primary', drilldown: kpiDrilldowns.transactions },
          { key: 'lowStock', title: 'Stock Alerts', value: '5', change: 2, changeLabel: 'critical items', icon: <AlertTriangle className="w-4 h-4" />, iconBg: 'bg-destructive/10 text-destructive', drilldown: kpiDrilldowns.lowStock },
        ],
        showRevenueChart: true,
        showTopProducts: true,
        showStockAlerts: true,
        showSmartAlerts: true,
        showCategoryPie: true,
      }
  }
}

// ─── Component ─────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [activeAlertIdx, setActiveAlertIdx] = useState<number | null>(null)

  const roleConfig = useMemo(() => getRoleConfig(user?.role), [user?.role])

  const today = revenueData[revenueData.length - 1]
  const yesterday = revenueData[revenueData.length - 2]
  const revenueChange = ((today.revenue - yesterday.revenue) / yesterday.revenue) * 100

  return (
    <div className="flex flex-col">
      <TopBar
        title={user?.role === 'cashier'
          ? `Point of Sale Overview`
          : user?.role === 'warehouse'
            ? `Inventory & Stock Overview`
            : user?.role === 'accounting'
              ? `Financial Dashboard`
              : `Good ${new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, ${user?.full_name?.split(' ')[0] || 'User'} 👋`
        }
        subtitle={
          user?.role === 'cashier'
            ? 'Your shift at a glance'
            : user?.role === 'warehouse'
              ? 'Monitor stock levels and pending orders'
              : user?.role === 'accounting'
                ? 'Real-time P&L overview'
                : "Here's what's happening at your restaurant today"
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
              <Download className="w-3.5 h-3.5" />
              Full Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Period Filter */}
        <div className="flex items-center gap-2">
          {(['today', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize',
                period === p
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>

        {/* Role-Based KPIs (5-7 max) — All Clickable with Drilldown */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {roleConfig.kpis.map((kpi) => (
            <button
              key={kpi.key}
              onClick={() => navigate(kpi.drilldown.path)}
              className="text-left w-full"
            >
              <StatsCard
                title={kpi.title}
                value={kpi.value}
                change={kpi.change}
                changeLabel={kpi.changeLabel}
                icon={kpi.icon}
                iconBg={kpi.iconBg}
                className="hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              />
            </button>
          ))}
        </div>

        {/* Revenue Trend Chart — Clickable to Reports */}
        {roleConfig.showRevenueChart && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <Card
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/reports')}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Revenue & Profit Trend</CardTitle>
                    <span className="text-xs text-muted-foreground">This week</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(221, 100%, 39%)" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="hsl(221, 100%, 39%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(221, 100%, 39%)" fill="url(#revenue)" strokeWidth={2} />
                      <Area type="monotone" dataKey="profit" name="Profit" stroke="hsl(142, 71%, 45%)" fill="url(#profit)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Category Pie */}
            {roleConfig.showCategoryPie && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Sales by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                        {categoryData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {categoryData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-semibold">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Top Products + Stock Alerts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {roleConfig.showTopProducts && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Top Products Today</CardTitle>
                  <span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {topProducts.map((product, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{product.sold} pcs</span>
                          <span className={`text-xs font-semibold ${product.trend > 0 ? 'text-success' : 'text-destructive'}`}>
                            {product.trend > 0 ? '+' : ''}{product.trend}%
                          </span>
                        </div>
                      </div>
                      <Progress value={(product.sold / 42) * 100} className="h-1.5" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {roleConfig.showStockAlerts && (
            <Card
              className="border-destructive/30 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/inventory')}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <CardTitle className="text-sm font-semibold">Critical Stock Alerts</CardTitle>
                  </div>
                  <Badge variant="destructive">{lowStockItems.filter(i => i.status === 'critical' || i.status === 'empty').length} items</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowStockItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-3 shrink-0">
                        <div className="text-right">
                          <p className={`text-sm font-bold tabular-nums ${item.stock === 0 ? 'text-destructive' : item.status === 'critical' ? 'text-destructive' : 'text-warning'}`}>
                            {item.stock} {item.unit}
                          </p>
                          <p className="text-xs text-muted-foreground">min: {item.minStock}</p>
                        </div>
                        <Badge variant={item.status === 'empty' ? 'destructive' : item.status === 'critical' ? 'destructive' : 'warning'} className="text-xs">
                          {item.status === 'empty' ? 'HABIS' : item.status === 'critical' ? 'Kritis' : 'Rendah'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Smart Alerts (Compact) */}
        {roleConfig.showSmartAlerts && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-warning" />
                <CardTitle className="text-sm font-semibold">Smart Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {smartAlerts.slice(0, 3).map((alert, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all',
                      alert.severity === 'high' ? 'bg-destructive/5 border-destructive/20' :
                      alert.severity === 'medium' ? 'bg-warning/5 border-warning/20' :
                      'bg-muted/50 border-border',
                    )}
                    onClick={() => setActiveAlertIdx(activeAlertIdx === i ? null : i)}
                  >
                    <AlertTriangle className={cn(
                      'w-4 h-4 mt-0.5 shrink-0',
                      alert.severity === 'high' ? 'text-destructive' :
                      alert.severity === 'medium' ? 'text-warning' :
                      'text-muted-foreground',
                    )} />
                    <p className="text-sm text-foreground">{alert.msg}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}