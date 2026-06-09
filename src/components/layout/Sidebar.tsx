import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, BookOpen,
  TruckIcon, BarChart3, Settings, ChevronDown, LogOut,
  Store, Users, Trash2, ClipboardList, Plus, Menu, X,
  Shield, History
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import supabase from '@/lib/supabase'
import toast from 'react-hot-toast'
import { focusRing, animation } from '@/lib/design-tokens'

interface NavItem {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: number
  roles?: string[]
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pos', icon: ShoppingCart, label: 'POS', roles: ['owner', 'manager', 'cashier'] },
  { to: '/inventory', icon: Boxes, label: 'Inventory', roles: ['owner', 'manager', 'warehouse'] },
  { to: '/products', icon: Package, label: 'Products', roles: ['owner', 'manager'] },
  { to: '/recipes', icon: BookOpen, label: 'Recipe Builder', roles: ['owner', 'manager'] },
  { to: '/purchases', icon: TruckIcon, label: 'Purchases', roles: ['owner', 'manager', 'warehouse'] },
  { to: '/suppliers', icon: Store, label: 'Suppliers', roles: ['owner', 'manager', 'warehouse'] },
  { to: '/customers', icon: Users, label: 'Customers', roles: ['owner', 'manager'] },
  { to: '/waste', icon: Trash2, label: 'Waste Logs', roles: ['owner', 'manager', 'warehouse'] },
  { to: '/opname', icon: ClipboardList, label: 'Stock Opname', roles: ['owner', 'manager', 'warehouse'] },
  { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['owner', 'manager', 'accounting'] },
  { to: '/audit', icon: Shield, label: 'Audit Trail', roles: ['owner'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['owner', 'manager'] },
]

interface SidebarProps {
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      logout()
      navigate('/auth')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  const handleNewSale = () => {
    navigate('/pos')
    onMobileClose?.()
  }

  // Filter items based on user role
  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true
    if (!user?.role) return true
    return item.roles.includes(user.role)
  })

  const sidebarContent = (
    <aside className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-primary leading-none truncate">ProStream</h1>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">ERP F&B</p>
          </div>
        </div>
        <Button onClick={handleNewSale} className="w-full" size="sm">
          <Plus className="w-4 h-4" />
          New Sale
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5" role="navigation" aria-label="Main navigation">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            onClick={() => {
              if (isMobile) onMobileClose?.()
            }}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
            aria-current={location.pathname.startsWith(item.to) ? 'page' : undefined}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors group">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {user ? getInitials(user.full_name) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{user?.full_name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">{user?.role || 'Staff'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive rounded"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )

  // Mobile: Drawer overlay
  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}

        {/* Drawer */}
        <div
          className={cn(
            'fixed left-0 top-0 h-full w-72 bg-card border-r border-border z-50',
            'transform transition-transform duration-300 ease-in-out md:hidden',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="absolute right-2 top-2">
            <button
              onClick={onMobileClose}
              className={cn('p-2 rounded-lg hover:bg-muted transition-colors', focusRing)}
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {sidebarContent}
        </div>

        {/* Desktop: Persistent sidebar (hidden on mobile) */}
        <div className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-30">
          {sidebarContent}
        </div>
      </>
    )
  }

  // Desktop and tablet: Persistent sidebar
  return (
    <div className={cn(
      'fixed left-0 top-0 h-full bg-card border-r border-border z-30 flex flex-col',
      'hidden md:flex md:w-20 lg:w-64',
      'transition-all duration-200',
    )}>
      {sidebarContent}
    </div>
  )
}