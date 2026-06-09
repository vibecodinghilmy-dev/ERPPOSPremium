import { useState } from 'react'
import { Download, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatPercent } from '@/lib/utils'
import toast from 'react-hot-toast'

const monthlyData = [
  { month: 'Jan', revenue: 98500000, cogs: 38215000, opex: 35460000, netProfit: 24825000 },
  { month: 'Feb', revenue: 112000000, cogs: 43680000, opex: 36200000, netProfit: 32120000 },
  { month: 'Mar', revenue: 124500000, cogs: 48255000, opex: 42165000, netProfit: 34080000 },
  { month: 'Apr', revenue: 108000000, cogs: 41904000, opex: 38340000, netProfit: 27756000 },
  { month: 'May', revenue: 135000000, cogs: 52380000, opex: 43245000, netProfit: 39375000 },
  { month: 'Jun', revenue: 142000000, cogs: 55096000, opex: 44720000, netProfit: 42184000 },
]

const expenseData = [
  { category: 'Salaries', amount: 18500000 },
  { category: 'Rent', amount: 12000000 },
  { category: 'Marketing', amount: 5000000 },
  { category: 'Utilities', amount: 3800000 },
  { category: 'Other', amount: 3000000 },
]

const profitTrend = [
  { month: 'Jan 2024', margin: 24.1 },
  { month: 'Feb 2024', margin: 25.8 },
  { month: 'Mar 2024', margin: 27.3 },
  { month: 'Apr 2024', margin: 26.0 },
  { month: 'May 2024', margin: 29.2 },
  { month: 'Jun 2024', margin: 29.7 },
]

const recentExpenses = [
  { date: '2024-10-24', category: 'SALARIES', notes: 'Front of House Payroll', amount: 8450000 },
  { date: '2024-10-22', category: 'MARKETING', notes: 'Instagram Ad Campaign', amount: 1200000 },
  { date: '2024-10-20', category: 'UTILITIES', notes: 'Electricity - Sept Bill', amount: 940500 },
  { date: '2024-10-18', category: 'OTHER', notes: 'Cleaning Supplies Refill', amount: 312200 },
  { date: '2024-10-15', category: 'RENT', notes: 'Lease Payment - Unit 4B', amount: 4500000 },
]

export function ReportsPage() {
  const [period, setPeriod] = useState('monthly')
  const [newExpense, setNewExpense] = useState({ category: 'salary', amount: '', date: '', notes: '' })

  const current = monthlyData[monthlyData.length - 1]
  const totalRevenue = 124500000
  const totalCOGS = 48200000
  const operationalCosts = 42300000
  const netProfit = totalRevenue - totalCOGS - operationalCosts

  const handleAddExpense = () => {
    if (!newExpense.amount || !newExpense.date) { toast.error('Amount and date required'); return }
    toast.success(`Expense of ${formatCurrency(parseFloat(newExpense.amount))} recorded`)
    setNewExpense({ category: 'salary', amount: '', date: '', notes: '' })
  }

  return (
    <div className="flex flex-col">
      <TopBar
        title="Financial Health"
        subtitle="Real-time P&L analysis and cost management"
        actions={
          <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> Export Report</Button>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total Revenue</p>
            <p className="text-2xl font-black mt-1 tabular-nums">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-success font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12.5%
            </p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Cost of Goods (COGS)</p>
            <p className="text-2xl font-black mt-1 tabular-nums">{formatCurrency(totalCOGS)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatPercent((totalCOGS / totalRevenue) * 100)} of Revenue</p>
          </CardContent></Card>
          <Card className="border-destructive/30 bg-destructive/5"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Operational Costs</p>
            <p className="text-2xl font-black text-destructive mt-1 tabular-nums">{formatCurrency(operationalCosts)}</p>
            <p className="text-xs text-destructive font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +4.2%
            </p>
          </CardContent></Card>
          <Card className="bg-primary text-primary-foreground border-0"><CardContent className="p-4">
            <p className="text-xs opacity-70 font-semibold uppercase tracking-wide">Net Profit</p>
            <p className="text-2xl font-black mt-1 tabular-nums">{formatCurrency(netProfit)}</p>
            <div className="mt-2 bg-primary-foreground/20 rounded-full h-1.5">
              <div className="bg-primary-foreground h-1.5 rounded-full" style={{ width: `${(netProfit / totalRevenue) * 100}%` }} />
            </div>
            <p className="text-xs opacity-70 mt-1">{formatPercent((netProfit / totalRevenue) * 100)} Margin</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="financial">
          <TabsList>
            <TabsTrigger value="financial">Financial Analysis</TabsTrigger>
            <TabsTrigger value="expenses">Operational Costs</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Operating Expenses Breakdown</CardTitle>
                      <div className="flex gap-1.5">
                        {(['monthly', 'quarterly'] as const).map((p) => (
                          <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all capitalize ${period === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={expenseData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(0)}M`} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="amount" fill="#004ac6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
                      {expenseData.map(e => (
                        <div key={e.category} className="text-center">
                          <p className="font-semibold text-foreground">{formatCurrency(e.amount).replace('Rp\u00a0', 'Rp ')}</p>
                          <p>{e.category}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Profit Trend</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">Net Margin Performance</p>
                    {profitTrend.slice(-3).map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="text-sm text-muted-foreground">{item.month}</span>
                        <span className={`text-lg font-black tabular-nums ${item.margin >= 27 ? 'text-success' : 'text-warning'}`}>{item.margin}%</span>
                      </div>
                    ))}
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Efficiency Rating</p>
                      <div className="flex gap-1 mt-1.5">
                        {[1, 2, 3, 4].map(i => <div key={i} className="w-5 h-5 text-warning">★</div>)}
                        <div className="w-5 h-5 text-muted">☆</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Insight: Reduce Energy Waste</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Utilities are up 15% vs last year. Switching to LED lighting could save ~Rp 150,000/month.</p>
                    <Button size="sm" className="mt-3 w-full">Explore Energy Audit</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Log New Expense</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">Category</Label>
                      <Select value={newExpense.category} onValueChange={(v) => setNewExpense(prev => ({ ...prev, category: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['salary', 'rent', 'electricity', 'water', 'internet', 'marketing', 'maintenance', 'other'].map(c => (
                            <SelectItem key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Amount (Rp)</Label>
                      <Input type="number" placeholder="0.00" value={newExpense.amount} onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={newExpense.date} onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input placeholder="Attach memo..." value={newExpense.notes} onChange={(e) => setNewExpense(prev => ({ ...prev, notes: e.target.value }))} className="mt-1" />
                    </div>
                    <Button className="w-full" onClick={handleAddExpense}>Record Expense</Button>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Recent Operational Costs</CardTitle>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">View Ledger</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recentExpenses.map((exp, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="text-xs text-muted-foreground w-20 shrink-0">{exp.date.split('-').slice(1).join(' Oct ')}</div>
                            <Badge variant={
                              exp.category === 'SALARIES' ? 'info' :
                              exp.category === 'MARKETING' ? 'warning' :
                              exp.category === 'UTILITIES' ? 'muted' :
                              exp.category === 'RENT' ? 'secondary' : 'muted'
                            } className="text-[10px]">{exp.category}</Badge>
                            <span className="text-sm text-muted-foreground">{exp.notes}</span>
                          </div>
                          <span className="font-bold text-destructive text-sm tabular-nums shrink-0">-{formatCurrency(exp.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Monthly Revenue, COGS & Net Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#004ac6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#004ac6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="net" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#004ac6" fill="url(#rev)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="netProfit" name="Net Profit" stroke="#059669" fill="url(#net)" strokeWidth={2} />
                    <Line type="monotone" dataKey="opex" name="OpEx" stroke="#bc4800" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
