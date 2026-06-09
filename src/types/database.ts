export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          role_id: string | null
          outlet_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      roles: {
        Row: {
          id: string
          name: string
          description: string | null
          permissions: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['roles']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['roles']['Insert']>
      }
      outlets: {
        Row: {
          id: string
          name: string
          address: string | null
          phone: string | null
          email: string | null
          tax_rate: number
          service_charge_rate: number
          currency: string
          timezone: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['outlets']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['outlets']['Insert']>
      }
      suppliers: {
        Row: {
          id: string
          outlet_id: string
          name: string
          phone: string | null
          whatsapp: string | null
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
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>
      }
      customers: {
        Row: {
          id: string
          outlet_id: string
          name: string
          phone: string | null
          email: string | null
          birthday: string | null
          points: number
          membership_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
          lifetime_spending: number
          visit_count: number
          last_transaction_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
      }
      units: {
        Row: {
          id: string
          name: string
          symbol: string
          type: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['units']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['units']['Insert']>
      }
      ingredient_categories: {
        Row: {
          id: string
          outlet_id: string
          name: string
          color: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ingredient_categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['ingredient_categories']['Insert']>
      }
      ingredients: {
        Row: {
          id: string
          outlet_id: string
          category_id: string | null
          supplier_id: string | null
          unit_id: string
          name: string
          sku: string | null
          purchase_price: number
          current_stock: number
          min_stock: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ingredients']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ingredients']['Insert']>
      }
      inventory_movements: {
        Row: {
          id: string
          outlet_id: string
          ingredient_id: string
          movement_type: string
          quantity: number
          unit_cost: number
          total_cost: number
          reference_id: string | null
          reference_type: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['inventory_movements']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['inventory_movements']['Insert']>
      }
      product_categories: {
        Row: {
          id: string
          outlet_id: string
          name: string
          color: string | null
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['product_categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['product_categories']['Insert']>
      }
      products: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      recipe_headers: {
        Row: {
          id: string
          outlet_id: string
          product_id: string
          version: number
          status: string
          total_hpp: number
          notes: string | null
          created_by: string | null
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['recipe_headers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['recipe_headers']['Insert']>
      }
      recipe_items: {
        Row: {
          id: string
          recipe_id: string
          ingredient_id: string
          quantity: number
          unit_id: string
          unit_cost: number
          total_cost: number
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['recipe_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['recipe_items']['Insert']>
      }
      purchases: {
        Row: {
          id: string
          outlet_id: string
          supplier_id: string | null
          po_number: string
          status: string
          order_date: string
          expected_date: string | null
          total_amount: number
          notes: string | null
          created_by: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['purchases']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['purchases']['Insert']>
      }
      purchase_items: {
        Row: {
          id: string
          purchase_id: string
          ingredient_id: string
          quantity: number
          unit_id: string
          unit_price: number
          total_price: number
          received_quantity: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['purchase_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['purchase_items']['Insert']>
      }
      sales: {
        Row: {
          id: string
          outlet_id: string
          customer_id: string | null
          sale_number: string
          order_type: string
          status: string
          subtotal: number
          tax_amount: number
          discount_amount: number
          service_charge: number
          total_amount: number
          payment_method: string
          notes: string | null
          table_number: string | null
          created_by: string | null
          void_reason: string | null
          voided_by: string | null
          voided_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sales']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['sales']['Insert']>
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          quantity: number
          unit_price: number
          discount_amount: number
          total_price: number
          hpp_at_sale: number
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sale_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['sale_items']['Insert']>
      }
      operational_costs: {
        Row: {
          id: string
          outlet_id: string
          category: string
          amount: number
          date: string
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['operational_costs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['operational_costs']['Insert']>
      }
      waste_logs: {
        Row: {
          id: string
          outlet_id: string
          ingredient_id: string
          quantity: number
          unit_id: string
          unit_cost: number
          total_cost: number
          reason: string
          status: string
          created_by: string | null
          approved_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['waste_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['waste_logs']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          outlet_id: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
          module: string
          action: string
          entity_type: string
          entity_id: string | null
          entity_label: string | null
          before_value: Json | null
          after_value: Json | null
          reason: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          outlet_id: string
          user_id: string | null
          type: string
          title: string
          message: string
          is_read: boolean
          reference_id: string | null
          reference_type: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      // ── NEW TABLES (Migration 00002) ──
      unit_conversions: {
        Row: {
          id: string
          outlet_id: string
          from_unit_id: string
          to_unit_id: string
          conversion_factor: number
          is_exact: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['unit_conversions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['unit_conversions']['Insert']>
      }
      packaging_items: {
        Row: {
          id: string
          outlet_id: string
          unit_id: string
          name: string
          sku: string | null
          description: string | null
          purchase_price: number
          current_stock: number
          min_stock: number
          supplier_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['packaging_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['packaging_items']['Insert']>
      }
      packaging_costs: {
        Row: {
          id: string
          outlet_id: string
          product_id: string
          packaging_item_id: string
          quantity_per_product: number
          unit_cost_at_calculation: number
          total_packaging_hpp: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['packaging_costs']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['packaging_costs']['Insert']>
      }
      semi_finished_products: {
        Row: {
          id: string
          outlet_id: string
          unit_id: string
          name: string
          sku: string | null
          description: string | null
          current_stock: number
          min_stock: number
          standard_yield: number
          shelf_life_days: number | null
          storage_instructions: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['semi_finished_products']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['semi_finished_products']['Insert']>
      }
      semi_finished_recipe_items: {
        Row: {
          id: string
          outlet_id: string
          semi_finished_id: string
          ingredient_id: string | null
          sub_semi_finished_id: string | null
          quantity: number
          unit_id: string
          unit_cost: number
          total_cost: number
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['semi_finished_recipe_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['semi_finished_recipe_items']['Insert']>
      }
      sale_item_hpp_snapshots: {
        Row: {
          id: string
          outlet_id: string
          sale_item_id: string
          sale_id: string
          product_id: string
          ingredient_hpp: number
          packaging_hpp: number
          labor_overhead_hpp: number
          total_hpp_per_unit: number
          quantity: number
          total_hpp: number
          recipe_version: number | null
          calculated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sale_item_hpp_snapshots']['Row'], 'id' | 'calculated_at'>
        Update: Partial<Database['public']['Tables']['sale_item_hpp_snapshots']['Insert']>
      }
      sale_item_profit_snapshots: {
        Row: {
          id: string
          outlet_id: string
          sale_item_id: string
          sale_id: string
          product_id: string
          unit_price: number
          unit_hpp: number
          unit_profit: number
          unit_margin_percent: number
          quantity: number
          total_profit: number
          total_revenue: number
          discount_amount: number
          discount_percent: number
          net_revenue: number
          net_profit: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sale_item_profit_snapshots']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['sale_item_profit_snapshots']['Insert']>
      }
      inventory_daily_snapshots: {
        Row: {
          id: string
          outlet_id: string
          ingredient_id: string
          snapshot_date: string
          opening_stock: number
          purchases_in: number
          transfers_in: number
          sales_out: number
          waste_out: number
          production_out: number
          transfers_out: number
          adjustments: number
          closing_stock: number
          average_unit_cost: number
          daily_usage_rate: number
          days_until_stockout: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['inventory_daily_snapshots']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['inventory_daily_snapshots']['Insert']>
      }
      stock_forecasts: {
        Row: {
          id: string
          outlet_id: string
          ingredient_id: string
          forecast_date: string
          predicted_opening: number
          predicted_purchases: number
          predicted_consumption: number
          predicted_closing: number
          reorder_point: number
          suggested_order_quantity: number
          confidence_score: number | null
          forecast_method: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['stock_forecasts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['stock_forecasts']['Insert']>
      }
      outlet_transfers: {
        Row: {
          id: string
          transfer_number: string
          source_outlet_id: string
          destination_outlet_id: string
          status: string
          total_items: number
          total_estimated_value: number
          notes: string | null
          requested_by: string | null
          approved_by: string | null
          shipped_by: string | null
          received_by: string | null
          shipped_at: string | null
          received_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['outlet_transfers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['outlet_transfers']['Insert']>
      }
      transfer_items: {
        Row: {
          id: string
          transfer_id: string
          ingredient_id: string
          quantity: number
          unit_id: string
          unit_cost: number
          total_cost: number
          received_quantity: number | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['transfer_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['transfer_items']['Insert']>
      }
      loyalty_rewards: {
        Row: {
          id: string
          outlet_id: string
          name: string
          description: string | null
          points_required: number
          reward_type: string
          reward_value: number | null
          reward_product_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['loyalty_rewards']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['loyalty_rewards']['Insert']>
      }
      opname_sessions: {
        Row: {
          id: string
          outlet_id: string
          name: string
          status: string
          total_items: number
          counted_items: number
          discrepancy_count: number
          total_discrepancy_value: number
          created_by: string | null
          approved_by: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['opname_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['opname_sessions']['Insert']>
      }
      opname_items: {
        Row: {
          id: string
          session_id: string
          ingredient_id: string
          system_stock: number
          physical_stock: number | null
          difference: number
          unit_cost: number
          difference_value: number
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['opname_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['opname_items']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']