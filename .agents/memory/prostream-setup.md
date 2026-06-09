---
name: ProStream ERP F&B Setup
description: How the Vite project was scaffolded and key gotchas for this environment
---

## Setup Approach

`create-vite` CLI cancels when the directory is non-empty (due to .git, .local, .agents, etc).
**Fix:** Scaffold all config files manually: package.json, vite.config.ts, tsconfig*.json, postcss.config.js, tailwind.config.js, index.html.

## Key Config

- Vite 6: `host: '0.0.0.0', port: 5000, allowedHosts: true` — use boolean `true`, NOT string `'all'` (string was Vite 5 syntax and causes "Blocked request" errors)
- Path alias: `@/` → `./src`, `@assets/` → `./attached_assets`
- Tailwind v3 with shadcn-style HSL CSS variables (NOT Tailwind v4)
- `@radix-ui/react-badge` does NOT exist as a package — Badge is a pure CVA component, no Radix dependency

## Demo Mode

- App works without Supabase using local Zustand state
- Auth page has "Try Demo" button that sets mock user in authStore and navigates to /dashboard
- Supabase credentials: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY env vars

**Why:** The Replit environment has no Supabase configured by default; demo mode avoids a broken first-run experience.
