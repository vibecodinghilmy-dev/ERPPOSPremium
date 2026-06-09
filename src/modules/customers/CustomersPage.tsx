import { useState } from 'react'
import { Plus, Search, Crown, Gift } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

const customers = [
  { id: 'c1', name: 'Jane Doe', email: 'jane.d@email.com', phone: '+62 812-3456-7890', tier: 'gold', points: 4200, spending: 2450000, visits: 28, lastVisit: '2024-10-24' },
  { id: 'c2', name: 'Marcus Smith', email: 'm.smith@web.com', phone: '+62 813-2345-6789', tier: 'silver', points: 1850, spending: 1120500, visits: 15, lastVisit: '2024-10-23' },
  { id: 'c3', name: 'Elena Lopez', email: 'elena.l@mail.com', phone: '+62 814-3456-7890', tier: 'bronze', points: 600, spending: 450250, visits: 6, lastVisit: '2024-10-22' },
  { id: 'c4', name: 'Sarah Chen', email: 'sarah.c@email.com', phone: '+62 815-4567-8901', tier: 'platinum', points: 12500, spending: 8750000, visits: 85, lastVisit: '2024-10-25' },
  { id: 'c5', name: 'David Wang', email: 'd.wang@email.com', phone: '+62 816-5678-9012', tier: 'gold', points: 3800, spending: 2100000, visits: 22, lastVisit: '2024-10-20' },
]

const tierConfig = {
  bronze: { label: 'Bronze', variant: 'warning' as const, color: 'text-amber-600', min: 0, max: 999 },
  silver: { label: 'Silver', variant: 'secondary' as const, color: 'text-slate-500', min: 1000, max: 4999 },
  gold: { label: 'Gold', variant: 'warning' as const, color: 'text-yellow-500', min: 5000, max: 14999 },
  platinum: { label: 'Platinum', variant: 'info' as const, color: 'text-primary', min: 15000, max: Infinity },
}

const recentActivity = [
  { customer: 'Jane Doe', action: 'purchased', detail: 'Dinner for 2', location: 'Table 12', amount: 84500, points: '+845', time: '15 mins ago' },
  { customer: 'Marcus Smith', action: 'redeemed', detail: 'Free Coffee', location: 'Counter', points: '-1000', time: '1 hour ago' },
  { customer: 'Elena Lopez', action: 'joined', detail: 'the program', location: 'Web App', points: null, time: '3 hours ago' },
  { customer: 'Sarah Chen', action: 'purchased', detail: 'Office Catering', location: 'POS', amount: 420000, points: '+4200', time: '5 hours ago' },
]

const loyaltyRules = [
  { title: '1,000 Points = 1 Free Specialty Coffee', desc: 'Valid on any hot or cold brew beverage' },
  { title: '5,000 Points = 25% Off Entire Meal', desc: 'Excludes alcoholic beverages' },
]

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('directory')

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col">
      <TopBar
        title="Customer Relationship Management"
        subtitle="Build loyalty and track customer lifetime value"
        actions={
          <Button size="sm"><Plus className="w-3.5 h-3.5" /> New Customer</Button>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Customers', value: customers.length, icon: '👥' },
            { label: 'Active (30 days)', value: customers.filter(c => new Date(c.lastVisit) > new Date(Date.now() - 30 * 86400000)).length, icon: '✅' },
            { label: 'Total Points Issued', value: `${(customers.reduce((s, c) => s + c.points, 0) / 1000).toFixed(1)}K`, icon: '⭐' },
            { label: 'Loyalty Revenue', value: formatCurrency(12450000), icon: '💰' },
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-3">
                <TabsList>
                  <TabsTrigger value="directory">Customer Directory</TabsTrigger>
                  <TabsTrigger value="loyalty">Loyalty Program</TabsTrigger>
                </TabsList>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-48 h-8 text-xs" />
                </div>
              </div>

              <TabsContent value="directory">
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</th>
                          <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tier</th>
                          <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Spending</th>
                          <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Points</th>
                          <th className="p-4" />
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(customer => {
                          const tier = tierConfig[customer.tier as keyof typeof tierConfig]
                          return (
                            <tr key={customer.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                    {getInitials(customer.name)}
                                  </div>
                                  <div>
                                    <p className="font-semibold">{customer.name}</p>
                                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge variant={tier.variant} className="uppercase">
                                  {customer.tier === 'platinum' && <Crown className="w-3 h-3 mr-1" />}
                                  {tier.label}
                                </Badge>
                              </td>
                              <td className="p-4 font-semibold tabular-nums">{formatCurrency(customer.spending)}</td>
                              <td className="p-4 font-bold text-primary tabular-nums">{customer.points.toLocaleString()} pts</td>
                              <td className="p-4">
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toast.success(`Viewing ${customer.name}`)}>
                                  View Profile
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="loyalty">
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Gift className="w-4 h-4 text-primary" />
                        Loyalty Program Configuration
                      </h3>
                      <Badge variant="success">Active</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 border border-border rounded-xl">
                        <p className="text-xs text-muted-foreground font-semibold mb-1">Earning Rules</p>
                        <p className="font-bold text-sm">$1 Spent = 10 Points</p>
                        <p className="text-xs text-muted-foreground">Global earning rate for all orders</p>
                      </div>
                      <div className="p-3 border border-border rounded-xl">
                        <p className="text-xs text-muted-foreground font-semibold mb-1">Tier Thresholds</p>
                        <p className="font-bold text-sm">Gold: 5,000+ Points</p>
                        <p className="text-xs text-muted-foreground">Automatic upgrades at threshold</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Reward Conversion Rules</p>
                      {loyaltyRules.map((rule, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border border-border rounded-lg mb-2">
                          <div>
                            <p className="text-sm font-semibold">{rule.title}</p>
                            <p className="text-xs text-muted-foreground">{rule.desc}</p>
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full mt-2" size="sm">
                        <Plus className="w-3.5 h-3.5" /> Add New Reward Rule
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Customer Activity</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 mt-0.5">
                      {activity.customer[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground">
                        <span className="font-semibold">{activity.customer}</span>{' '}
                        {activity.action}{' '}
                        <span className="font-semibold">{activity.detail}</span>
                      </p>
                      <p className="text-muted-foreground">{activity.time} • {activity.location}</p>
                      {activity.amount && <p className="font-semibold">+{formatCurrency(activity.amount)}</p>}
                      {activity.points && (
                        <Badge variant={activity.points.startsWith('+') ? 'success' : 'destructive'} className="text-[10px] mt-0.5">
                          {activity.points} Points {activity.points.startsWith('+') ? 'Awarded' : 'Redeemed'}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground border-0">
              <CardContent className="p-4">
                <p className="text-xs opacity-70 uppercase font-semibold tracking-wide">Revenue Insights</p>
                <p className="text-xs opacity-70 mt-0.5">Last 30 Days</p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <p className="text-xs opacity-70">Loyalty Revenue</p>
                    <p className="text-lg font-black tabular-nums">{formatCurrency(12450000)}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-70">Avg Order Value</p>
                    <p className="text-lg font-black tabular-nums">{formatCurrency(42800)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
