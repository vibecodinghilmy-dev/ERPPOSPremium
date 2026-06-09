export interface AuditLog {
  id: string
  user_id: string
  user_name: string
  user_role: string
  module: AuditModule
  action: AuditAction
  entity_type: string
  entity_id: string
  entity_label: string
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  reason: string | null
  ip_address: string | null
  created_at: string
}

export type AuditModule =
  | 'auth'
  | 'dashboard'
  | 'pos'
  | 'inventory'
  | 'products'
  | 'recipes'
  | 'purchases'
  | 'suppliers'
  | 'customers'
  | 'waste'
  | 'opname'
  | 'reports'
  | 'settings'

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'void'
  | 'refund'
  | 'login'
  | 'logout'
  | 'export'
  | 'bulk_update'

export interface AuditFilter {
  module?: AuditModule
  action?: AuditAction
  user_id?: string
  entity_type?: string
  date_from?: string
  date_to?: string
  search?: string
}

export function createAuditEntry(
  module: AuditModule,
  action: AuditAction,
  entityType: string,
  entityId: string,
  entityLabel: string,
  beforeData: Record<string, unknown> | null,
  afterData: Record<string, unknown> | null,
  reason?: string,
): Omit<AuditLog, 'id' | 'created_at' | 'user_name' | 'user_role'> {
  return {
    user_id: '',
    module,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_label: entityLabel,
    before_data: beforeData,
    after_data: afterData,
    reason: reason || null,
    ip_address: null,
  }
}