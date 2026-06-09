import { supabase } from '../../src/lib/supabase'

export interface CustomerRow {
  id: string
  outlet_id: string
  name: string
  phone: string | null
  email: string | null
  birthday: string | null
  points: number
  membership_tier: string
  lifetime_spending: number
  visit_count: number
  last_transaction_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export class CustomerRepository {
  async getCustomers(outletId: string): Promise<CustomerRow[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('outlet_id', outletId)
      .order('name')

    if (error) throw new Error(`Failed to fetch customers: ${error.message}`)
    return data || []
  }

  async getCustomer(id: string): Promise<CustomerRow | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch customer: ${error.message}`)
    }
    return data
  }

  async searchCustomers(outletId: string, query: string): Promise<CustomerRow[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('outlet_id', outletId)
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20)

    if (error) throw new Error(`Failed to search customers: ${error.message}`)
    return data || []
  }

  async createCustomer(customer: Partial<CustomerRow>): Promise<CustomerRow> {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single()

    if (error) throw new Error(`Failed to create customer: ${error.message}`)
    return data
  }

  async updateCustomer(id: string, updates: Partial<CustomerRow>): Promise<CustomerRow> {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update customer: ${error.message}`)
    return data
  }

  async incrementVisit(id: string, spending: number): Promise<void> {
    const { error } = await supabase.rpc('increment_customer_visit', {
      customer_id: id,
      amount: spending,
    })
    if (error) throw new Error(`Failed to increment visit: ${error.message}`)
  }
}