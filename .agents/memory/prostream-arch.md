---
name: ProStream ERP Architecture
description: Module structure, component conventions, and state management decisions
---

## Module Structure

All 12 modules live under `src/modules/<module>/`:
auth, dashboard, pos, inventory, products, recipes, purchases, suppliers, customers, waste, opname, reports, settings

Each module has a single `<Name>Page.tsx` file exporting a named component.

## Component Conventions

- `src/components/ui/` — shadcn-style primitives (button, card, badge, input, dialog, select, tabs, table, progress, separator, dropdown-menu)
- `src/components/layout/` — AppLayout (Outlet wrapper), Sidebar, TopBar
- `src/components/shared/` — StatsCard, EmptyState, LoadingState, DataTable

## State Management

- **Zustand** for client state: `authStore` (user/isAuthenticated), `posStore` (cart/order)
- **TanStack Query** for server state (wired up in main.tsx, used by future Supabase queries)
- **react-hot-toast** for all toast notifications

## Routing

- BrowserRouter with nested routes; AppLayout wraps all protected pages via `<Outlet />`
- `ProtectedRoute` component in App.tsx handles redirect to /auth when not authenticated

**Why:** Outlet-based nesting keeps the sidebar/topbar persistent across navigation without remounting.
