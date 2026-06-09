import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'
import supabase from '@/lib/supabase'
import toast from 'react-hot-toast'

export function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const { setUser, setIsLoading: setAuthLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter your email and password')
      return
    }
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || data.user.email!,
          role: data.user.user_metadata?.role || 'cashier',
          permissions: data.user.user_metadata?.permissions || [],
        })
        navigate('/dashboard')
        toast.success('Welcome back!')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = () => {
    setIsDemoLoading(true)
    setTimeout(() => {
      setUser({
        id: 'demo-user',
        email: 'demo@prostream.app',
        full_name: 'Alex Morgan',
        role: 'owner',
        outlet_id: 'demo-outlet',
        outlet_name: 'ProStream Cafe - Main Branch',
        permissions: ['*'],
      })
      setAuthLoading(false)
      navigate('/dashboard')
      toast.success('Welcome to ProStream ERP Demo!')
      setIsDemoLoading(false)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-primary leading-none">ProStream</h1>
              <p className="text-sm text-muted-foreground leading-none mt-1">ERP F&B Platform</p>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Access your restaurant management dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs text-muted-foreground">
                <span className="bg-card px-2">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleDemoLogin}
              disabled={isDemoLoading}
            >
              {isDemoLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                '🚀 Try Demo (No Setup Required)'
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Demo mode uses local state. Connect Supabase in Settings for full persistence.
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { role: 'Owner', desc: 'Full access', color: 'text-primary' },
            { role: 'Manager', desc: 'Operations', color: 'text-success' },
            { role: 'Cashier', desc: 'POS only', color: 'text-warning' },
          ].map((item) => (
            <div key={item.role} className="bg-card/80 border border-border rounded-xl p-3 text-center">
              <p className={`text-xs font-bold ${item.color}`}>{item.role}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
