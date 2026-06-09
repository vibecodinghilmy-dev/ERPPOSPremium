import { useState } from 'react'
import { Save, Building2, Database, Shield, Bell, Printer, Users, ChevronRight } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import toast from 'react-hot-toast'

const rolePermissions = [
  { role: 'Owner', desc: 'Full access to all features and settings', permissions: 'All', canEdit: false },
  { role: 'Manager', desc: 'Manage operations, approve purchases and waste logs', permissions: 'High', canEdit: true },
  { role: 'Cashier', desc: 'POS access only — process sales and view products', permissions: 'Low', canEdit: true },
  { role: 'Warehouse', desc: 'Inventory management, stock opname, waste logs', permissions: 'Medium', canEdit: true },
  { role: 'Accounting', desc: 'Financial reports, operational costs, audit logs', permissions: 'Medium', canEdit: true },
]

export function SettingsPage() {
  const [outlet, setOutlet] = useState({
    name: 'ProStream Cafe - Main Branch',
    address: 'Jl. Sudirman No. 45, Jakarta Pusat',
    phone: '+62 21-555-0100',
    email: 'main@prostream.cafe',
    taxRate: '11',
    serviceCharge: '0',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  })

  const [supabaseUrl, setSupabaseUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '')
  const [supabaseKey, setSupabaseKey] = useState('')

  const handleSaveOutlet = () => {
    toast.success('Outlet settings saved')
  }

  const handleSaveDatabase = () => {
    if (!supabaseUrl || !supabaseKey) { toast.error('Please enter both Supabase URL and Key'); return }
    toast.success('Database settings saved. Reload to apply.')
  }

  return (
    <div className="flex flex-col">
      <TopBar
        title="Settings"
        subtitle="Configure your restaurant operations"
      />

      <div className="p-6">
        <Tabs defaultValue="outlet">
          <TabsList className="mb-6">
            <TabsTrigger value="outlet"><Building2 className="w-3.5 h-3.5 mr-1.5" /> Outlet</TabsTrigger>
            <TabsTrigger value="database"><Database className="w-3.5 h-3.5 mr-1.5" /> Database</TabsTrigger>
            <TabsTrigger value="roles"><Shield className="w-3.5 h-3.5 mr-1.5" /> Roles</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="w-3.5 h-3.5 mr-1.5" /> Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="outlet">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Outlet Information</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { key: 'name', label: 'Outlet Name', placeholder: 'Restaurant name' },
                    { key: 'address', label: 'Address', placeholder: 'Full address' },
                    { key: 'phone', label: 'Phone', placeholder: '+62...' },
                    { key: 'email', label: 'Email', placeholder: 'contact@restaurant.com' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <Label className="text-xs">{label}</Label>
                      <Input
                        placeholder={placeholder}
                        value={outlet[key as keyof typeof outlet]}
                        onChange={(e) => setOutlet(prev => ({ ...prev, [key]: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  ))}
                  <Button className="w-full mt-2" onClick={handleSaveOutlet}>
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Financial Configuration</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Tax Rate (%)</Label>
                      <Input type="number" value={outlet.taxRate} onChange={(e) => setOutlet(p => ({ ...p, taxRate: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Service Charge (%)</Label>
                      <Input type="number" value={outlet.serviceCharge} onChange={(e) => setOutlet(p => ({ ...p, serviceCharge: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Currency</Label>
                    <Select value={outlet.currency} onValueChange={(v) => setOutlet(p => ({ ...p, currency: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IDR">IDR (Indonesian Rupiah)</SelectItem>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                        <SelectItem value="SGD">SGD (Singapore Dollar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Timezone</Label>
                    <Select value={outlet.timezone} onValueChange={(v) => setOutlet(p => ({ ...p, timezone: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Jakarta">WIB (UTC+7) - Jakarta</SelectItem>
                        <SelectItem value="Asia/Makassar">WITA (UTC+8) - Makassar</SelectItem>
                        <SelectItem value="Asia/Jayapura">WIT (UTC+9) - Jayapura</SelectItem>
                        <SelectItem value="Asia/Singapore">SGT (UTC+8) - Singapore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full mt-2" onClick={handleSaveOutlet}>
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="database">
            <div className="max-w-xl space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Supabase Configuration</CardTitle>
                    <Badge variant={supabaseUrl ? 'success' : 'warning'}>
                      {supabaseUrl ? 'Connected' : 'Not Configured'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">Connect to your Supabase project</p>
                    <p>ProStream uses Supabase for real-time data, authentication, and row-level security. Create a project at supabase.com and enter your credentials below.</p>
                  </div>
                  <div>
                    <Label className="text-xs">Supabase Project URL</Label>
                    <Input
                      placeholder="https://xxxx.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Supabase Anon Key</Label>
                    <Input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      className="mt-1 font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Found in Supabase Dashboard → Settings → API</p>
                  </div>
                  <Button className="w-full" onClick={handleSaveDatabase}>
                    <Database className="w-3.5 h-3.5" /> Save & Connect
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Database Schema</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    Run the migration script in your Supabase SQL editor to create all required tables.
                  </p>
                  <div className="space-y-1.5">
                    {['users', 'outlets', 'ingredients', 'inventory_movements', 'products', 'recipe_headers', 'recipe_items', 'purchases', 'sales', 'operational_costs', 'waste_logs', 'audit_logs'].map((table) => (
                      <div key={table} className="flex items-center justify-between py-1.5 px-3 bg-muted/30 rounded-lg">
                        <span className="font-mono text-xs">{table}</span>
                        <Badge variant="muted" className="text-[10px]">Table</Badge>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-3" onClick={() => toast.success('Schema copied to clipboard')}>
                    Copy Migration SQL
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="roles">
            <div className="max-w-2xl space-y-3">
              {rolePermissions.map((role) => (
                <Card key={role.role}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{role.role}</p>
                          <p className="text-xs text-muted-foreground">{role.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={role.permissions === 'All' ? 'info' : role.permissions === 'High' ? 'success' : role.permissions === 'Medium' ? 'warning' : 'muted'}>
                          {role.permissions}
                        </Badge>
                        {role.canEdit && (
                          <Button variant="ghost" size="icon-sm">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="max-w-xl">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Smart Alert Configuration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { title: 'Low Stock Alerts', desc: 'Notify when ingredient falls below minimum stock', enabled: true },
                    { title: 'Price Change Alerts', desc: 'Notify when supplier prices change significantly', enabled: true },
                    { title: 'Profit Margin Alerts', desc: 'Notify when net margin drops below target', enabled: true },
                    { title: 'Waste Cost Alerts', desc: 'Notify when waste exceeds weekly threshold', enabled: false },
                    { title: 'Purchase Order Reminders', desc: 'Remind when PO is pending approval', enabled: true },
                    { title: 'Inventory Discrepancy Alerts', desc: 'Notify when stock opname shows large differences', enabled: true },
                  ].map((alert, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.desc}</p>
                      </div>
                      <button
                        className={`w-11 h-6 rounded-full transition-colors relative ${alert.enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                        onClick={() => toast.success(`${alert.title} ${alert.enabled ? 'disabled' : 'enabled'}`)}
                      >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${alert.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
