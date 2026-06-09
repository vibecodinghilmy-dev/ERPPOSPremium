// ============================================================================
// ProStream ERP F&B — Base Supabase Repository
// Provides CRUD, filtering, pagination, and audit logging foundation
// ============================================================================

import { supabase } from '../../src/lib/supabase'

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface FilterParams {
  column: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is'
  value: unknown
}

export interface SortParams {
  column: string
  direction: 'asc' | 'desc'
}

export class BaseRepository<T extends Record<string, unknown>> {
  constructor(
    protected tableName: string,
    protected primaryKey: string = 'id',
  ) {}

  /**
   * Get a single record by primary key
   */
  async getById(id: string, outletId?: string): Promise<T | null> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq(this.primaryKey, id)

    if (outletId) {
      query = query.eq('outlet_id', outletId)
    }

    const { data, error } = await query.single()
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to get ${this.tableName}: ${error.message}`)
    }
    return data as unknown as T
  }

  /**
   * List records with optional filtering, sorting, and pagination
   */
  async list(params?: {
    outletId?: string
    filters?: FilterParams[]
    sort?: SortParams
    pagination?: PaginationParams
    select?: string
  }): Promise<PaginatedResult<T>> {
    let query = supabase
      .from(this.tableName)
      .select(params?.select || '*', { count: 'exact' })

    // Outlet filter
    if (params?.outletId) {
      query = query.eq('outlet_id', params.outletId)
    }

    // Custom filters
    if (params?.filters) {
      for (const f of params.filters) {
        query = (query as any)[f.operator](f.column, f.value)
      }
    }

    // Sorting
    if (params?.sort) {
      query = query.order(params.sort.column, { ascending: params.sort.direction === 'asc' })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // Pagination
    const page = params?.pagination?.page || 1
    const pageSize = params?.pagination?.pageSize || 50
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) {
      throw new Error(`Failed to list ${this.tableName}: ${error.message}`)
    }

    return {
      data: (data || []) as unknown as T[],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    }
  }

  /**
   * Create a new record
   */
  async create(record: Partial<T>): Promise<T> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(record as any)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create ${this.tableName}: ${error.message}`)
    }
    return data as unknown as T
  }

  /**
   * Update an existing record
   */
  async update(id: string, updates: Partial<T>, outletId?: string): Promise<T> {
    let query = supabase
      .from(this.tableName)
      .update(updates as any)
      .eq(this.primaryKey, id)

    if (outletId) {
      query = query.eq('outlet_id', outletId as any)
    }

    const { data, error } = await query.select().single()
    if (error) {
      throw new Error(`Failed to update ${this.tableName}: ${error.message}`)
    }
    return data as unknown as T
  }

  /**
   * Delete a record
   */
  async delete(id: string, outletId?: string): Promise<void> {
    let query = supabase
      .from(this.tableName)
      .delete()
      .eq(this.primaryKey, id)

    if (outletId) {
      query = query.eq('outlet_id', outletId as any)
    }

    const { error } = await query
    if (error) {
      throw new Error(`Failed to delete ${this.tableName}: ${error.message}`)
    }
  }

  /**
   * Search records by text column
   */
  async search(column: string, query: string, outletId?: string): Promise<T[]> {
    let q = supabase
      .from(this.tableName)
      .select('*')
      .ilike(column, `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (outletId) {
      q = q.eq('outlet_id', outletId as any)
    }

    const { data, error } = await q
    if (error) {
      throw new Error(`Failed to search ${this.tableName}: ${error.message}`)
    }
    return (data || []) as unknown as T[]
  }

  /**
   * Count records matching criteria
   */
  async count(outletId?: string, filters?: FilterParams[]): Promise<number> {
    let query = supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })

    if (outletId) {
      query = query.eq('outlet_id', outletId)
    }

    if (filters) {
      for (const f of filters) {
        query = (query as any)[f.operator](f.column, f.value)
      }
    }

    const { count, error } = await query
    if (error) {
      throw new Error(`Failed to count ${this.tableName}: ${error.message}`)
    }
    return count || 0
  }
}