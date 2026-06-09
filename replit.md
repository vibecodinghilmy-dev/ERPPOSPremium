# ProStream ERP F&B

A production-ready ERP + POS platform for Food & Beverage businesses built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, and Zustand.

## Architecture

Feature-based module architecture under `src/modules/`:

- **dashboard/** — Real-time KPIs, revenue trends, stock alerts, smart notifications
- **pos/** — Point of Sale terminal with cart, payment methods, order types
- **inventory/** — Ingredient management, stock levels, low-stock alerts
- **products/** — Product catalog with HPP/margin calculations
- **recipes/** — Recipe builder with live HPP calculation, ingredient cost tracking
- **purchases/** — Purchase orders, supplier management, goods receipt
- **suppliers/** — Supplier directory, performance tracking, contact management
- **customers/** — CRM with loyalty program, points, membership tiers
- **waste/** — Waste logging with approval workflow
- **opname/** — Stock opname (physical count) with discrepancy detection
- **reports/** — Financial health: P&L, COGS, OpEx, Net Profit analysis
- **settings/** — Outlet config, Supabase DB connection, roles & permissions

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **State**: TanStack Query (server) + Zustand (client)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Charts**: Recharts
- **Icons**: Lucide React

## Running

```bash
npm install
npm run dev
```

The app runs on port 5000.

## Environment Variables

Set these in Replit Secrets or `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Or configure them in Settings → Database within the app itself.

## User Preferences

- Indonesian Rupiah (IDR) as default currency
- Indonesian language for product/ingredient names
- Mobile-first responsive layout
- Dark mode supported
