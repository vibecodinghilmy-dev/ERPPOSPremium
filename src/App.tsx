import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthPage } from '@/modules/auth/AuthPage'
import { DashboardPage } from '@/modules/dashboard/DashboardPage'
import { POSPage } from '@/modules/pos/POSPage'
import { InventoryPage } from '@/modules/inventory/InventoryPage'
import { ProductsPage } from '@/modules/products/ProductsPage'
import { RecipesPage } from '@/modules/recipes/RecipesPage'
import { PurchasesPage } from '@/modules/purchases/PurchasesPage'
import { SuppliersPage } from '@/modules/suppliers/SuppliersPage'
import { CustomersPage } from '@/modules/customers/CustomersPage'
import { WastePage } from '@/modules/waste/WastePage'
import { OpnamePage } from '@/modules/opname/OpnamePage'
import { ReportsPage } from '@/modules/reports/ReportsPage'
import { SettingsPage } from '@/modules/settings/SettingsPage'
import { AuditLogPage } from '@/modules/audit/AuditLogPage'
import { useAuthStore } from '@/stores/authStore'
import { PageLoader } from '@/components/shared/LoadingState'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return null
  return <>{children}</>
}

export default function App() {
  const { setIsLoading } = useAuthStore()

  useEffect(() => {
    setIsLoading(false)
  }, [setIsLoading])

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="pos" element={<POSPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="waste" element={<WastePage />} />
        <Route path="opname" element={<OpnamePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
