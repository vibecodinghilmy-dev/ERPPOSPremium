// ============================================================================
// Offline POS Queue (HR-5)
// Uses IndexedDB to queue transactions when offline.
// Auto-syncs when connectivity returns.
// States: pending → synced | failed
// ============================================================================

import type { QueuedTransaction, CreateSaleInput, POSResult } from './types'
import { transactionCoordinator } from '../transaction/coordinator'

const DB_NAME = 'prostream_pos_queue'
const DB_VERSION = 1
const STORE_NAME = 'transactions'
const MAX_RETRIES = 5
const RETRY_DELAY_MS = 2000

// ─── IndexedDB Helpers ─────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ─── Queue Operations ──────────────────────────────────────────────

class POSOfflineQueue {
  private isSyncing = false

  /**
   * Queue a transaction locally (IndexedDB).
   * Used when the device is offline.
   */
  async enqueue(payload: CreateSaleInput): Promise<QueuedTransaction> {
    const transaction: QueuedTransaction = {
      id: `queued_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      payload,
    }

    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    await new Promise<void>((resolve, reject) => {
      const request = store.add(transaction)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    db.close()
    return transaction
  }

  /**
   * Get all pending transactions
   */
  async getPending(): Promise<QueuedTransaction[]> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('status')

    const transactions: QueuedTransaction[] = []

    await new Promise<void>((resolve, reject) => {
      const request = index.getAll('pending')
      request.onsuccess = () => {
        transactions.push(...request.result)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })

    db.close()
    return transactions.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
  }

  /**
   * Get all failed transactions (for retry)
   */
  async getFailed(): Promise<QueuedTransaction[]> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('status')

    const transactions: QueuedTransaction[] = []

    await new Promise<void>((resolve, reject) => {
      const request = index.getAll('failed')
      request.onsuccess = () => {
        transactions.push(...request.result)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })

    db.close()
    return transactions
  }

  /**
   * Update a transaction's status and result
   */
  async update(
    id: string,
    updates: Partial<Pick<QueuedTransaction, 'status' | 'syncedAt' | 'error' | 'retryCount' | 'result'>>,
  ): Promise<void> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    const existing = await new Promise<QueuedTransaction | undefined>((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    if (!existing) return

    const updated = { ...existing, ...updates }
    await new Promise<void>((resolve, reject) => {
      const request = store.put(updated)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    db.close()
  }

  /**
   * Sync all pending transactions.
   * Called when connectivity is restored.
   */
  async syncAll(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 }
    this.isSyncing = true

    let synced = 0
    let failed = 0

    try {
      const pending = await this.getPending()

      for (const transaction of pending) {
        try {
          const result = await transactionCoordinator.executeSale({
            outletId: transaction.payload.outletId,
            userId: transaction.payload.cashierId,
            idempotencyKey: transaction.payload.idempotencyKey,
            customerId: transaction.payload.customerId,
            items: transaction.payload.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: item.discountAmount,
              hppAtSale: 0, // Will be calculated server-side
            })),
            orderType: transaction.payload.orderType,
            paymentMethod: transaction.payload.paymentMethod,
            discountAmount: transaction.payload.discountAmount,
            taxRate: transaction.payload.taxRate,
            serviceChargeRate: transaction.payload.serviceChargeRate,
            tableNumber: transaction.payload.tableNumber,
            notes: transaction.payload.notes,
          })

          if (result.success) {
            await this.update(transaction.id, {
              status: 'synced',
              syncedAt: new Date().toISOString(),
              result,
            })
            synced++
          } else {
            await this.update(transaction.id, {
              status: 'failed',
              error: result.error,
              retryCount: transaction.retryCount + 1,
            })
            failed++
          }
        } catch (error: any) {
          const newRetryCount = transaction.retryCount + 1
          if (newRetryCount >= MAX_RETRIES) {
            await this.update(transaction.id, {
              status: 'failed',
              error: error.message,
              retryCount: newRetryCount,
            })
            failed++
          } else {
            await this.update(transaction.id, {
              retryCount: newRetryCount,
              error: error.message,
            })
            // Will retry on next sync
          }
        }
      }
    } finally {
      this.isSyncing = false
    }

    return { synced, failed }
  }

  /**
   * Get all synced transactions
   */
  async getSynced(): Promise<QueuedTransaction[]> {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('status')

    const transactions: QueuedTransaction[] = []

    await new Promise<void>((resolve, reject) => {
      const request = index.getAll('synced')
      request.onsuccess = () => {
        transactions.push(...request.result)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })

    db.close()
    return transactions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }

  /**
   * Get queue status summary
   */
  async getStatus(): Promise<{
    pending: number
    synced: number
    failed: number
    total: number
  }> {
    const pending = await this.getPending()
    const failed = await this.getFailed()
    const synced = await this.getSynced()

    return {
      pending: pending.length,
      synced: synced.length,
      failed: failed.length,
      total: pending.length + synced.length + failed.length,
    }
  }

  /**
   * Clear all synced transactions older than 7 days
   */
  async cleanOldSynced(): Promise<number> {
    const synced = await this.getSynced()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)

    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    let deleted = 0

    for (const t of synced) {
      if (new Date(t.createdAt) < cutoff) {
        await new Promise<void>((resolve, reject) => {
          const request = store.delete(t.id)
          request.onsuccess = () => { deleted++; resolve() }
          request.onerror = () => reject(request.error)
        })
      }
    }

    db.close()
    return deleted
  }
}

// Singleton
export const posOfflineQueue = new POSOfflineQueue()

// ─── Auto-sync on connectivity change ──────────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[POS Offline Queue] Online — syncing pending transactions...')
    posOfflineQueue.syncAll().then((result) => {
      if (result.synced > 0 || result.failed > 0) {
        console.log(`[POS Offline Queue] Sync complete: ${result.synced} synced, ${result.failed} failed`)
      }
    })
  })

  // Try sync on page load
  if (navigator.onLine) {
    setTimeout(() => {
      posOfflineQueue.syncAll().catch(() => {})
    }, 3000)
  }
}