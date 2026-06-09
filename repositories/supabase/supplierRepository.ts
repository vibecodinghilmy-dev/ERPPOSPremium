import { supabase } from '../../src/lib/supabase'

export interface SupplierRow {
  id: string
  outlet_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  npwp: string | null
  notes: string | null
  performance_score: number
  total_orders: number
  total_spend: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export class SupplierRepository {
  async getSuppliers(outletId: string): Promise<SupplierRow[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('outlet_id', outletId)
      .order('name')

    if (error) throw new Error(`Failed to fetch suppliers: ${error.message}`)
    return data || []
  }

  async getSupplier(id: string): Promise<SupplierRow | null> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch supplier: ${error.message}`)
    }
    return data
  }

  async createSupplier(supplier: Partial<SupplierRow>): Promise<SupplierRow> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select()
      .single()

    if (error) throw new Error(`Failed to create supplier: ${error.message}`)
    return data
  }

  async updateSupplier(id: string, updates: Partial<SupplierRow>): Promise<SupplierRow> {
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update supplier: ${error.message}`)
    return data
  }
}