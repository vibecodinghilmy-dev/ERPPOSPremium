import { supabase } from '../../src/lib/supabase'

export interface ProductRow {
  id: string
  outlet_id: string
  category_id: string | null
  name: string
  description: string | null
  image_url: string | null
  selling_price: number
  hpp: number
  is_active: boolean
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface ProductWithCategory extends ProductRow {
  product_categories?: { name: string; color: string | null } | null
}

export class ProductRepository {
  async getProducts(outletId: string): Promise<ProductWithCategory[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`*, product_categories (name, color)`)
      .eq('outlet_id', outletId)
      .order('name')

    if (error) throw new Error(`Failed to fetch products: ${error.message}`)
    return data || []
  }

  async getProduct(id: string): Promise<ProductRow | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch product: ${error.message}`)
    }
    return data
  }

  async createProduct(product: Partial<ProductRow>): Promise<ProductRow> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single()

    if (error) throw new Error(`Failed to create product: ${error.message}`)
    return data
  }

  async updateProduct(id: string, updates: Partial<ProductRow>): Promise<ProductRow> {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update product: ${error.message}`)
    return data
  }

  async getCategories(outletId: string): Promise<Array<{ id: string; name: string; color: string | null }>> {
    const { data, error } = await supabase
      .from('product_categories')
      .select('id, name, color')
      .eq('outlet_id', outletId)
      .order('sort_order')

    if (error) throw new Error(`Failed to fetch categories: ${error.message}`)
    return data || []
  }

  async searchProducts(outletId: string, query: string): Promise<ProductWithCategory[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_categories (name, color)')
      .eq('outlet_id', outletId)
      .ilike('name', `%${query}%`)
      .limit(20)

    if (error) throw new Error(`Failed to search products: ${error.message}`)
    return data || []
  }
}