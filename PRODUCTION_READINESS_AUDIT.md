# ProStream ERP F&B — Production Readiness Audit

**Audit Date:** June 9, 2026  
**Scope:** Concurrency Safety, Race Conditions, Inventory Consistency, Transaction Integrity, Supabase Limitations, RLS Security, Data Loss, Offline Scenarios, Multi-Tab POS, Multi-Cashier  
**Severity:** 🔴 Critical | 🟠 High | 🟡 Medium | 💡 Recommended Fix

---

## 🔴 CRITICAL RISKS

### CR-1: No Database-Level Transactions (Supabase Limitation)

**Problem:**  
Supabase (PostgREST) does not support multi-table database transactions. The `TransactionCoordinator.executeSale()` performs 5 sequential operations (sale insert → sale_items insert → inventory movements → profit snapshot → audit log) as individual HTTP requests. If the process fails after step 1 but before step 5, the system has a partial transaction: sale exists but inventory was not consumed, profit not calculated, and no audit trail.

**Business Impact:**  
- A POS sale can be partially processed: customer is charged, sale appears in reports, but ingredients are not deducted.  
- Inventory goes out of sync: perpetual shortage in the system leads to phantom stock.  
- Profit calculations miss sales, causing incorrect P&L reporting.  
- In multi-cashier environments, this happens silently — no alert is raised.

**Technical Cause:**  
PostgREST (Supabase REST API) lacks `BEGIN`/`COMMIT`/`ROLLBACK` support. Each `supabase.from().insert()` is an independent HTTP call. There is no two-phase commit mechanism. The current "rollback" in `executeSale` is not a real database rollback — it simply returns an error object. Already-inserted records (sale, movement) persist.

**Solution:**  
- **Short term (immediate):** Add a compensation/cleanup routine that checks for orphaned sales (sale where `sale_items` count mismatches or missing movements) and alerts the owner. Run as a cron every 5 minutes.  
- **Mid term:** Use Supabase's `pg_graphql` or raw SQL via `supabase.rpc()` to execute the entire transaction as a single PostgreSQL function with `BEGIN`/`COMMIT`/`ROLLBACK`.  
- **Long term:** Migrate to a dedicated backend (Node.js/Next.js API routes) that uses connection pooling and proper database transactions.

---

### CR-2: Read-Modify-Write Race Condition on Stock

**Problem:**  
`InventoryRuntimeEngine.mutate()` performs a read (`getIngredient`), validation, then write (`setStock`) as separate async operations with no optimistic concurrency control. Two concurrent requests for the same ingredient can interleave:
```
Cashier A: read stock=50
Cashier B: read stock=50
Cashier A: write stock=50-2=48
Cashier B: write stock=50-1=49  ← OVERWRITES A's change!
```

**Business Impact:**  
- Phantom inventory: Two cashiers selling the same burger patty at the same time both succeed, but only one patty is deducted.  
- Actual stock runs out faster than the system reports.  
- In high-volume lunch rushes (10+ transactions/minute), this happens multiple times per shift.

**Technical Cause:**  
The `setStock` method uses `update ... current_stock = value` with no version check or atomic increment. Supabase's REST API doesn't support `UPDATE ... RETURNING` with conditional checks easily. There is no `SELECT ... FOR UPDATE` locking available.

**Solution:**  
- **Short term:** Use Supabase RPC with `UPDATE ingredients SET current_stock = current_stock + delta WHERE id = $1 AND current_stock + delta >= 0`. This makes stock changes atomic at the database level.  
- **Implement optimistic locking:** Add a `version` column to `ingredients`. Each update checks `WHERE version = old_version` and increments. Retry on conflict.  
- **Fallback:** Daily reconciliation job that compares `inventory_movements` total vs `ingredients.current_stock` and alerts on mismatch.

---

### CR-3: Partial Inventory Consumption on Sale Item Loop

**Problem:**  
`TransactionCoordinator.executeSale()` consumes inventory in a loop (line 103-123). If the loop fails on the 3rd product out of 5, the first 2 products' ingredients were already deducted. The "rollback" in the catch block does NOT reverse these deductions.

**Business Impact:**  
- Inventory permanently deducted for products that were not fully processed.  
- Customer may or may not have been charged (sale was created before inventory loop started).  
- No audit trail for the partial consumption.

**Technical Cause:**  
The error handler at line 180-198 only logs the error and returns a failed `POSResult`. It does not call any compensation logic. The `movementIds` array is populated as the loop progresses, but the catch block doesn't use it for reversal.

**Solution:**  
- Implement a proper compensation loop in the catch block that reverses all movements completed before the failure.  
- Use the `movementIds` array to create reverse movements (positive quantity for negative, negative for positive).  
- Mark the sale as `voided` with reason "incomplete transaction" if items were not all processed.

---

### CR-4: No idempotency Key for POS Transactions

**Problem:**  
There is no idempotency key or transaction deduplication. If the network fails after the sale is inserted but before the response reaches the POS terminal, the cashier may retry. The retry creates a duplicate sale.

**Business Impact:**  
- Duplicate charges for the same customer.  
- Inventory deducted twice for the same product.  
- Inflated revenue reporting.  
- Waste of ingredients.

**Technical Cause:**  
The POS terminal has no way to know if a previous attempt succeeded. The `sale_number` is auto-generated server-side, so even identical carts produce different sales.

**Solution:**  
- Generate an idempotency key (`idempotency_key`) on the client before submitting.  
- Store it in the `sales` table with a UNIQUE constraint.  
- If a duplicate key is detected, return the existing sale record instead of creating a new one.  
- Add a `retry_count` field to track attempts.

---

## 🟠 HIGH RISKS

### HR-1: Cross-Outlet Inventory Transfer Consistency

**Problem:**  
`transferStock()` deducts from source outlet first, then adds to destination. If the process fails after deduction but before addition, the stock disappears from the system entirely.

**Business Impact:**  
- Stock loss during transfers between outlets.  
- Inventory reconciliation becomes unreliable.  
- Multi-outlet businesses cannot trust transfer records.

**Technical Cause:**  
Two separate `mutate()` calls with no two-phase commit. The operation is not wrapped in a Supabase transaction.

**Solution:**  
- Wrap the entire transfer in a single Supabase RPC function that uses `BEGIN`/`COMMIT`/`ROLLBACK` at the PostgreSQL level.  
- If RPC is not possible, implement a "transfer request" workflow: create a transfer record with status `pending`, then process source deduction and destination addition as background jobs with retry logic.  
- Add a reconciliation report that shows transfers with `source_deducted=true` but `destination_added=false`.

---

### HR-2: Singleton Inventory Engine Creates Shared State

**Problem:**  
`getInventoryEngine()` returns a singleton instance. If one instance is used across multiple concurrent requests (multi-cashier, multi-tab), the in-memory repository is shared state. While the Supabase version is stateless, the singleton pattern creates confusion about lifecycle and makes testing difficult.

**Business Impact:**  
- Hard to reason about state in tests.  
- If a future developer adds in-memory caching to the engine, they'll hit the race condition in CR-2.  
- Testing concurrent scenarios requires manual cleanup.

**Technical Cause:**  
The singleton is created once and never reset. Module-level state encourages caching anti-patterns.

**Solution:**  
- Remove the singleton. Use dependency injection everywhere.  
- Create a new `InventoryRuntimeEngine` instance per request scope.  
- If caching is needed, use a dedicated cache layer (Redis) with TTL.

---

### HR-3: No Deadlock Prevention for Concurrent Stock Writes

**Problem:**  
When two cashiers sell products that share ingredients (e.g., both sell items using "Premium Milk Base"), Supabase's row-level locking does not prevent deadlocks. If `TransactionCoordinator` were to use a database function, concurrent calls could deadlock.

**Business Impact:**  
- Sales fail with deadlock errors during peak hours.  
- Customer-facing delays.  
- Cashiers forced to retry, leading to idempotency issues.

**Technical Cause:**  
PostgreSQL row-level locks are acquired in the order of `UPDATE` execution. If Transaction A locks ingredient 1 then waits for ingredient 2, while Transaction B locks ingredient 2 then waits for ingredient 1, a deadlock occurs.

**Solution:**  
- Always acquire locks in a consistent order (e.g., by ingredient ID).  
- Sort the items in the sale by `productId` before processing inventory.  
- Set a reasonable `lock_timeout` in PostgreSQL and handle timeout errors with retries.  
- Implement exponential backoff retry logic in the TransactionCoordinator.

---

### HR-4: RLS Bypass via Direct Client Queries

**Problem:**  
`BaseRepository` and all Supabase repos use the client-side supabase instance. Row-Level Security (RLS) policies are defined in the migration (lines 736-1000), but the policies rely on `auth.uid()` which works only when the client is authenticated. If a client session expires, subsequent queries silently return empty results instead of errors.

**Business Impact:**  
- Users see empty screens without knowing their session expired.  
- Data appears to "disappear" until the user refreshes.  
- Audit logs may be created without proper user attribution.

**Technical Cause:**  
Supabase RLS returns empty results (not errors) when the user is not authenticated or lacks permissions. The repos treat empty results as "no data found" rather than "access denied."

**Solution:**  
- Add a session check middleware that validates `auth.getSession()` before every query.  
- Throw a specific "AuthorizationRequired" error when session is missing.  
- Show a "Please log in again" message instead of an empty table.  
- Add proper error handling in `BaseRepository.list()` to distinguish between "no rows" and "access denied."

---

### HR-5: No Offline Queue for POS Transactions

**Problem:**  
The POS terminal sends requests directly to Supabase with no offline queue. If the internet connection drops during a sale, the transaction fails and the customer cannot be served.

**Business Impact:**  
- F&B business cannot process payments during internet outage.  
- Revenue loss during downtime.  
- Cashiers revert to paper tickets, causing reconciliation nightmares.

**Technical Cause:**  
All services make direct HTTP calls to Supabase with no offline persistence layer.

**Solution:**  
- Implement an offline transaction queue using IndexedDB or localStorage.  
- When offline, queue the sale and process it when connectivity returns.  
- Use idempotency keys (CR-4) to prevent duplicates when replaying the queue.  
- Show a clear "offline mode" indicator on the POS UI.  
- Cache product catalog and inventory locally for offline menu browsing.

---

## 🟡 MEDIUM RISKS

### MR-1: Stock Opname Race Condition

**Problem:**  
`processOpname()` reads current stock, then applies an adjustment. If a sale occurs between the read and the write, the opname will overwrite the sale's consumption.

**Example:**  
1. Opname reads stock = 50  
2. Sale deducts 2 → stock = 48  
3. Opname adjusts from 50 → 45 (based on physical count)  
4. Stock becomes 45 instead of 46 (48 - 3 actual difference)

**Solution:**  
- Lock the ingredient row during opname processing (`SELECT ... FOR UPDATE`).  
- Or process opname adjustments as delta from current stock, not absolute values.  
- Schedule opname during low-traffic hours only.  
- Add a warning if sales occurred during the opname session.

---

### MR-2: No Unique Constraint on inventory_movements.reference_id + reference_type

**Problem:**  
The `inventory_movements` table has no unique constraint on `(reference_id, reference_type)`. The same sale could trigger duplicate inventory movements if `consume()` is called multiple times for the same product.

**Business Impact:**  
- Double-counted inventory deductions.  
- Phantom negative stock.  
- Incorrect HPP calculations.

**Solution:**  
- Add a UNIQUE constraint on `(reference_id, reference_type, movement_type)`.  
- Use `ON CONFLICT DO NOTHING` for idempotency.  
- Validate in the engine that movement doesn't already exist.

---

### MR-3: Profit Snapshot Not Persistent

**Problem:**  
`ProfitEngine.createSaleSnapshot()` returns a `ProfitSnapshot` object but does not persist it to any database table. The profit snapshot exists only in memory during the request.

**Business Impact:**  
- If the server restarts, all profit snapshots are lost.  
- Cannot audit historical profit calculations per sale.  
- Monthly profit aggregation recalculates from raw sales, missing corrected/voided entries.

**Solution:**  
- Create a `profit_snapshots` database table and persist snapshots.  
- The snapshot should include: `sale_id, revenue, hpp, gross_profit, operational_costs, net_profit, product_breakdown (JSONB), calculated_at`.

---

### MR-4: No Rate Limiting on POS Endpoints

**Problem:**  
There is no rate limiting on POS transaction creation. In multi-tab scenarios, a cashier could accidentally submit the same transaction multiple times.

**Business Impact:**  
- Duplicate sales.  
- Double inventory deduction.  
- Fraud potential (malicious repeated submissions).

**Solution:**  
- Implement client-side debounce (disable the "Pay" button after first click).  
- Add server-side rate limiting per user (max 1 sale per second).  
- Combine with idempotency keys (CR-4).

---

### MR-5: RLS Policy for Operational Costs Is Too Permissive

**Problem:**  
Migration line 967-975: The RLS policy for `operational_costs` allows INSERT from any authenticated user in the outlet, including cashiers. Operational costs should only be insertable by `owner`, `manager`, or `accounting` roles.

**Business Impact:**  
- A cashier could record fraudulent expenses.  
- Net profit calculations become unreliable.  
- Audit trail compromised.

**Solution:**  
- Restrict INSERT policy to `user_has_any_role(ARRAY['owner', 'manager', 'accounting'])`.  
- Add a check in the `OperationalCostEngine.recordCost()` method as defense in depth.

---

### MR-6: No Input Validation for Numeric Fields

**Problem:**  
The `BaseRepository` and specific repos accept `Partial<T>` without validating that numeric fields like `amount`, `quantity`, and `price` are non-negative and within reasonable ranges.

**Business Impact:**  
- Negative prices/quantities could corrupt financial calculations.  
- Extremely large values could cause overflow or display issues.  
- "Human error" entries (e.g., Rp 100,000,000 instead of Rp 100,000) go through without confirmation.

**Solution:**  
- Add Zod schemas for all input types in the services layer.  
- Validate before writing to the database.  
- Add confirmation dialogs for amounts above configurable thresholds.

---

### MR-7: Multi-Tab POS Creates Multiple Active Carts

**Problem:**  
The `posStore` uses Zustand, which stores state in memory per browser tab. A cashier with two POS tabs open has two independent carts, but both can submit sales against the same inventory.

**Business Impact:**  
- CR-2 and CR-3 are more likely with multi-tab usage.  
- Cashiers may accidentally process the same order on two tabs.  
- No warning when same product is being sold on another tab.

**Solution:**  
- Show a warning if the cashier has multiple POS tabs open.  
- Use a shared localStorage key to detect duplicate tabs.  
- Implement real-time inventory updates via Supabase Realtime subscriptions so stock reflects across tabs instantly.

---

### MR-8: No Audit for Read Operations

**Problem:**  
The audit log only records CREATE, UPDATE, DELETE actions. Read operations (viewing financial reports, checking inventory) are not logged.

**Business Impact:**  
- Cannot detect suspicious data browsing (e.g., a cashier checking financial reports they shouldn't have access to).  
- No evidence for insider threat investigations.

**Solution:**  
- Log all access to sensitive modules (Reports, Profit, Audit Log) as audit entries with `action: 'read'`.  
- This is a low-priority enhancement but important for financial compliance.

---

### MR-9: Dynamic Import Race Condition in consume()

**Problem:**  
Line 109: `const { getRecipeConsumption } = await import('../../services/hpp/index')` uses a dynamic import inside the `consume()` method. This import is evaluated every time `consume()` is called, adding latency. If multiple `consume()` calls happen concurrently, the dynamic import may execute multiple times.

**Business Impact:**  
- Increased latency for POS transactions (dynamic import adds 50-200ms).  
- Inconsistent behavior if the module fails to load dynamically.  
- Harder to tree-shake during build.

**Solution:**  
- Move the import to the top of the file.  
- Or inject the HPP service via dependency injection like the repository.

---

### MR-10: No Request Timeout Configuration

**Problem:**  
Supabase client has no explicit timeout configuration. If Supabase is slow or unreachable, requests may hang indefinitely, blocking the POS transaction flow.

**Business Impact:**  
- POS terminal freezes during network issues.  
- Cashier cannot proceed until timeout (which may be 30+ seconds).  
- Poor customer experience.

**Solution:**  
- Configure a 10-second timeout on Supabase client:  
  ```ts
  createClient(url, key, { global: { fetch: (url, opts) => fetch(url, { ...opts, signal: AbortSignal.timeout(10000) }) } })
  ```
- Show a loading state with timeout indicator in the POS UI.
- Fail fast and allow retry.

---

## SUMMARY

| Severity | Count | Key Areas |
|----------|:-----:|-----------|
| 🔴 **Critical** | 4 | Database transactions, race conditions, partial operations, idempotency |
| 🟠 **High** | 5 | Transfer consistency, singleton anti-pattern, deadlocks, RLS gaps, offline support |
| 🟡 **Medium** | 10 | Opname race conditions, duplicate movements, profit persistence, rate limiting, validation, multi-tab, audit gaps, dynamic imports, timeouts |
| **Total** | **19** | |

---

## TOP 5 FIXES BY BUSINESS IMPACT

| # | Issue | Risk | Fix Priority |
|---|-------|:----:|-------------|
| 1 | **Supabase lacks DB transactions** → partial sales | 🔴 CR-1 | Week 1 |
| 2 | **Read-modify-write race on stock** → phantom inventory | 🔴 CR-2 | Week 1 |
| 3 | **No idempotency** → duplicate charges | 🔴 CR-4 | Week 1 |
| 4 | **No offline queue** → cannot sell during outage | 🟠 HR-5 | Week 2 |
| 5 | **Partial inventory loop** → unreversed deductions | 🔴 CR-3 | Week 2 |

---

## ARCHITECTURAL RECOMMENDATIONS

1. **Database function for transactions**: Move the entire POS sale flow into a single PostgreSQL function (`process_sale()`) that handles `BEGIN`/`COMMIT`/`ROLLBACK` atomically.

2. **Atomic stock updates**: Replace `read → compute → write` with `UPDATE ... SET current_stock = current_stock + delta` to eliminate race conditions.

3. **Idempotency layer**: Generate `idempotency_key` on the client, store in the database with a UNIQUE constraint, check before processing.

4. **Offline-first architecture**: Implement an offline queue using IndexedDB that syncs when connectivity returns, with conflict resolution.

5. **Compensation transactions**: Every transaction should have a compensating transaction that can reverse its effects completely.

6. **Real-time inventory sync**: Use Supabase Realtime subscriptions to push stock updates to all connected clients, ensuring multi-tab/multi-cashier awareness.

7. **Dedicated backend**: For production scale, extract transaction processing to a Node.js/Next.js API server with proper connection pooling, database transactions, and retry logic.