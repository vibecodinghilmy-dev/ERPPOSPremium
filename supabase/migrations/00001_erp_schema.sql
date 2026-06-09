-- ============================================================================
-- ProStream ERP F&B — Complete Database Schema
-- Version: 1.0.0
-- Description: Full ERP schema with tables, enums, indexes, RLS, and seed data
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 1: EXTENSIONS & ENUMS                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Membership tiers for loyalty program
CREATE TYPE membership_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- Inventory movement types (audit trail for stock changes)
CREATE TYPE movement_type AS ENUM (
  'purchase', 'sale', 'waste', 'adjustment', 'transfer', 'production', 'opname'
);

-- Purchase order statuses
CREATE TYPE po_status AS ENUM ('draft', 'pending', 'approved', 'received', 'cancelled');

-- Sale order types
CREATE TYPE order_type AS ENUM ('dine_in', 'take_away', 'delivery');

-- Sale statuses
CREATE TYPE sale_status AS ENUM ('pending', 'processing', 'completed', 'cancelled', 'refunded');

-- Payment methods
CREATE TYPE payment_method AS ENUM ('cash', 'qris', 'debit', 'credit', 'split');

-- Operational cost categories
CREATE TYPE cost_category AS ENUM ('rent', 'electricity', 'water', 'internet', 'salary', 'marketing', 'maintenance', 'other');

-- Waste log statuses
CREATE TYPE waste_status AS ENUM ('pending', 'approved', 'rejected');

-- Recipe statuses
CREATE TYPE recipe_status AS ENUM ('draft', 'active', 'archived');

-- Notification types
CREATE TYPE notification_type AS ENUM ('low_stock', 'price_change', 'profit_alert', 'system', 'purchase', 'sale');

-- User roles for role-based access control
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'cashier', 'warehouse', 'accounting', 'admin');

-- Audit action types
CREATE TYPE audit_action AS ENUM (
  'create', 'update', 'delete', 'approve', 'reject', 'void', 'refund',
  'login', 'logout', 'export', 'bulk_update'
);

-- Unit types
CREATE TYPE unit_type AS ENUM ('weight', 'volume', 'pieces', 'length', 'package');

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 2: CORE TABLES                                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- OUTLETS — Multi-branch / multi-outlet support
-- ============================================================================
CREATE TABLE outlets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 11.00,
  service_charge_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROLES — Predefined permission sets
-- ============================================================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name user_role NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- USERS — Staff accounts linked to auth.users
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'cashier',
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  phone VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- UNITS — Measurement units (kg, liter, pcs, etc.)
-- ============================================================================
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  type unit_type NOT NULL DEFAULT 'pieces',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INGREDIENT CATEGORIES — Group inventory items (Dairy, Meat, etc.)
-- ============================================================================
CREATE TABLE ingredient_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, name)
);

-- ============================================================================
-- SUPPLIERS — Vendor management
-- ============================================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  npwp VARCHAR(50),
  notes TEXT,
  performance_score INTEGER NOT NULL DEFAULT 100 CHECK (performance_score >= 0 AND performance_score <= 100),
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spend NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INGREDIENTS — Raw materials / inventory items
-- ============================================================================
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  category_id UUID REFERENCES ingredient_categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  purchase_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_stock NUMERIC(15,3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(15,3) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, name)
);

-- ============================================================================
-- INVENTORY MOVEMENTS — Stock transaction audit trail
-- ============================================================================
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  movement_type movement_type NOT NULL,
  quantity NUMERIC(15,3) NOT NULL,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  reference_id UUID, -- FK to purchase, sale, waste, etc.
  reference_type VARCHAR(50),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PRODUCT CATEGORIES — Menu grouping (Beverages, Main Course, etc.)
-- ============================================================================
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, name)
);

-- ============================================================================
-- PRODUCTS — Menu items / sellable products
-- ============================================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  selling_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  hpp NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, name)
);

-- ============================================================================
-- RECIPE HEADERS — Links ingredients to products (with versioning)
-- ============================================================================
CREATE TABLE recipe_headers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status recipe_status NOT NULL DEFAULT 'draft',
  total_hpp NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, version)
);

-- ============================================================================
-- RECIPE ITEMS — Individual ingredients within a recipe
-- ============================================================================
CREATE TABLE recipe_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipe_headers(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(15,3) NOT NULL DEFAULT 0,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CUSTOMERS — CRM & loyalty program
-- ============================================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  birthday DATE,
  points INTEGER NOT NULL DEFAULT 0,
  membership_tier membership_tier NOT NULL DEFAULT 'bronze',
  lifetime_spending NUMERIC(15,2) NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  last_transaction_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PURCHASES — Purchase orders to suppliers
-- ============================================================================
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  po_number VARCHAR(50) NOT NULL,
  status po_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, po_number)
);

-- ============================================================================
-- PURCHASE ITEMS — Line items within purchase orders
-- ============================================================================
CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(15,3) NOT NULL DEFAULT 0,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  received_quantity NUMERIC(15,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SALES — Customer transactions
-- ============================================================================
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  sale_number VARCHAR(50) NOT NULL,
  order_type order_type NOT NULL DEFAULT 'dine_in',
  status sale_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  service_charge NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  notes TEXT,
  table_number VARCHAR(10),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  void_reason TEXT,
  voided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, sale_number)
);

-- ============================================================================
-- SALE ITEMS — Line items within sales
-- ============================================================================
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  hpp_at_sale NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- OPERATIONAL COSTS — Business expenses tracking
-- ============================================================================
CREATE TABLE operational_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  category cost_category NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- WASTE LOGS — Inventory loss tracking
-- ============================================================================
CREATE TABLE waste_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(15,3) NOT NULL DEFAULT 0,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  status waste_status NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOGS — Complete system activity history
-- ============================================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  user_role user_role,
  module VARCHAR(100) NOT NULL,
  action audit_action NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  entity_label VARCHAR(255),
  before_value JSONB,
  after_value JSONB,
  reason TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS — In-app alerts
-- ============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  reference_type VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- LOVALTY REWARDS — Reward conversion rules
-- ============================================================================
CREATE TABLE loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  reward_type VARCHAR(50) NOT NULL, -- 'discount', 'free_item', 'item_discount'
  reward_value NUMERIC(15,2), -- discount amount or percentage
  reward_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STOCK OPNAME — Physical count sessions
-- ============================================================================
CREATE TABLE opname_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- in_progress, completed, approved
  total_items INTEGER NOT NULL DEFAULT 0,
  counted_items INTEGER NOT NULL DEFAULT 0,
  discrepancy_count INTEGER NOT NULL DEFAULT 0,
  total_discrepancy_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE opname_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES opname_sessions(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  system_stock NUMERIC(15,3) NOT NULL DEFAULT 0,
  physical_stock NUMERIC(15,3),
  difference NUMERIC(15,3) GENERATED ALWAYS AS (COALESCE(physical_stock, 0) - system_stock) STORED,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  difference_value NUMERIC(15,2) GENERATED ALWAYS AS ((COALESCE(physical_stock, 0) - system_stock) * unit_cost) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, ingredient_id)
);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 3: INDEXES                                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Core lookup indexes
CREATE INDEX idx_users_outlet_id ON users(outlet_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_email ON users(email);

-- Inventory indexes
CREATE INDEX idx_ingredients_outlet_id ON ingredients(outlet_id);
CREATE INDEX idx_ingredients_category_id ON ingredients(category_id);
CREATE INDEX idx_ingredients_supplier_id ON ingredients(supplier_id);
CREATE INDEX idx_ingredients_current_stock ON ingredients(current_stock);
CREATE INDEX idx_ingredients_name_search ON ingredients USING gin(name gin_trgm_ops);
CREATE INDEX idx_ingredients_sku ON ingredients(sku);

-- Inventory movements indexes
CREATE INDEX idx_inventory_movements_ingredient_id ON inventory_movements(ingredient_id);
CREATE INDEX idx_inventory_movements_outlet_id ON inventory_movements(outlet_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at DESC);
CREATE INDEX idx_inventory_movements_reference ON inventory_movements(reference_id, reference_type);

-- Product indexes
CREATE INDEX idx_products_outlet_id ON products(outlet_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_name_search ON products USING gin(name gin_trgm_ops);
CREATE INDEX idx_products_is_active ON products(is_active);

-- Recipe indexes
CREATE INDEX idx_recipe_headers_product_id ON recipe_headers(product_id);
CREATE INDEX idx_recipe_headers_status ON recipe_headers(status);
CREATE INDEX idx_recipe_items_ingredient_id ON recipe_items(ingredient_id);
CREATE INDEX idx_recipe_items_recipe_id ON recipe_items(recipe_id);

-- Purchase indexes
CREATE INDEX idx_purchases_outlet_id ON purchases(outlet_id);
CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_po_number ON purchases(po_number);
CREATE INDEX idx_purchases_order_date ON purchases(order_date DESC);
CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);

-- Sale indexes
CREATE INDEX idx_sales_outlet_id ON sales(outlet_id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_sales_sale_number ON sales(sale_number);
CREATE INDEX idx_sales_payment_method ON sales(payment_method);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

-- Customer indexes
CREATE INDEX idx_customers_outlet_id ON customers(outlet_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_membership_tier ON customers(membership_tier);
CREATE INDEX idx_customers_name_search ON customers USING gin(name gin_trgm_ops);

-- Supplier indexes
CREATE INDEX idx_suppliers_outlet_id ON suppliers(outlet_id);
CREATE INDEX idx_suppliers_name_search ON suppliers USING gin(name gin_trgm_ops);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);

-- Audit log indexes
CREATE INDEX idx_audit_logs_outlet_id ON audit_logs(outlet_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Opname indexes
CREATE INDEX idx_opname_sessions_outlet_id ON opname_sessions(outlet_id);
CREATE INDEX idx_opname_items_session_id ON opname_items(session_id);
CREATE INDEX idx_opname_items_ingredient_id ON opname_items(ingredient_id);

-- Waste indexes
CREATE INDEX idx_waste_logs_outlet_id ON waste_logs(outlet_id);
CREATE INDEX idx_waste_logs_status ON waste_logs(status);
CREATE INDEX idx_waste_logs_created_at ON waste_logs(created_at DESC);

-- Operational costs indexes
CREATE INDEX idx_operational_costs_outlet_id ON operational_costs(outlet_id);
CREATE INDEX idx_operational_costs_category ON operational_costs(category);
CREATE INDEX idx_operational_costs_date ON operational_costs(date DESC);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 4: FUNCTIONS & TRIGGERS                                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_outlets_updated_at
  BEFORE UPDATE ON outlets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON ingredients FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_recipe_headers_updated_at
  BEFORE UPDATE ON recipe_headers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_opname_sessions_updated_at
  BEFORE UPDATE ON opname_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_loyalty_rewards_updated_at
  BEFORE UPDATE ON loyalty_rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Sale auto-numbering (sequential per outlet per day)
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS sale_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TRIGGER AS $$
DECLARE
  date_part VARCHAR(8);
  seq_part TEXT;
  outlet_code VARCHAR(3);
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  seq_part := LPAD(NEXTVAL('sale_number_seq')::TEXT, 4, '0');
  outlet_code := LPAD(COALESCE(
    (SELECT SUBSTRING(name FROM 1 FOR 3) FROM outlets WHERE id = NEW.outlet_id),
    'XXX'
  ), 3, 'X');
  NEW.sale_number := UPPER(outlet_code) || '/' || date_part || '/' || seq_part;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sale_number
  BEFORE INSERT ON sales FOR EACH ROW
  WHEN (NEW.sale_number IS NULL OR NEW.sale_number = '')
  EXECUTE FUNCTION generate_sale_number();

-- ============================================================================
-- Purchase order auto-numbering
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.po_number := 'PO-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(NEXTVAL('po_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_po_number
  BEFORE INSERT ON purchases FOR EACH ROW
  WHEN (NEW.po_number IS NULL OR NEW.po_number = '')
  EXECUTE FUNCTION generate_po_number();

-- ============================================================================
-- Auto-creates inventory movement on stock change
-- ============================================================================
CREATE OR REPLACE FUNCTION log_inventory_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_stock IS DISTINCT FROM NEW.current_stock THEN
    INSERT INTO inventory_movements (
      outlet_id, ingredient_id, movement_type, quantity, unit_cost,
      reference_id, notes
    ) VALUES (
      NEW.outlet_id,
      NEW.id,
      'adjustment',
      NEW.current_stock - OLD.current_stock,
      NEW.purchase_price,
      NULL,
      'Auto-logged stock adjustment'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Auto-logs audit entries for critical tables
-- ============================================================================
CREATE OR REPLACE FUNCTION log_audit_entry()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    outlet_id, module, action, entity_type, entity_id,
    entity_label, before_value, after_value
  ) VALUES (
    COALESCE(NEW.outlet_id, OLD.outlet_id),
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'create'
      WHEN TG_OP = 'UPDATE' THEN 'update'
      WHEN TG_OP = 'DELETE' THEN 'delete'
    END,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.name, OLD.name, 'Unknown'),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::JSONB ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::JSONB ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Enable audit triggers on key tables
CREATE TRIGGER audit_ingredients AFTER INSERT OR UPDATE OR DELETE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION log_audit_entry();

CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION log_audit_entry();

CREATE TRIGGER audit_suppliers AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION log_audit_entry();

CREATE TRIGGER audit_purchases AFTER INSERT OR UPDATE OR DELETE ON purchases
  FOR EACH ROW EXECUTE FUNCTION log_audit_entry();

CREATE TRIGGER audit_sales AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION log_audit_entry();

CREATE TRIGGER audit_waste_logs AFTER INSERT OR UPDATE OR DELETE ON waste_logs
  FOR EACH ROW EXECUTE FUNCTION log_audit_entry();

CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION log_audit_entry();

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 5: ROW-LEVEL SECURITY POLICIES                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Enable RLS on all tables
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE opname_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE opname_items ENABLE ROW LEVEL SECURITY;

-- Helper function: Get current user's outlet_id
CREATE OR REPLACE FUNCTION get_user_outlet_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT outlet_id FROM users WHERE auth_user_id = auth.uid()
$$;

-- Helper function: Check if user has a specific role
CREATE OR REPLACE FUNCTION user_has_role(required_role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid() AND role = required_role
  )
$$;

-- Helper function: Check if user has one of the required roles
CREATE OR REPLACE FUNCTION user_has_any_role(required_roles user_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid() AND role = ANY(required_roles)
  )
$$;

-- ── OUTLETS ──
CREATE POLICY "outlets_select_own" ON outlets
  FOR SELECT USING (
    id = get_user_outlet_id() OR user_has_role('owner')
  );
CREATE POLICY "outlets_insert_owner" ON outlets
  FOR INSERT WITH CHECK (user_has_role('owner'));
CREATE POLICY "outlets_update_owner" ON outlets
  FOR UPDATE USING (user_has_role('owner'));

-- ── USERS ──
CREATE POLICY "users_select_own_outlet" ON users
  FOR SELECT USING (
    outlet_id = get_user_outlet_id() OR auth_user_id = auth.uid()
  );
CREATE POLICY "users_insert_owner_manager" ON users
  FOR INSERT WITH CHECK (user_has_any_role(ARRAY['owner', 'manager']));
CREATE POLICY "users_update_own_or_admin" ON users
  FOR UPDATE USING (
    auth_user_id = auth.uid() OR user_has_role('owner')
  );

-- ── INGREDIENTS ──
CREATE POLICY "ingredients_select" ON ingredients
  FOR SELECT USING (outlet_id = get_user_outlet_id());
CREATE POLICY "ingredients_insert" ON ingredients
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );
CREATE POLICY "ingredients_update" ON ingredients
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );
CREATE POLICY "ingredients_delete" ON ingredients
  FOR DELETE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_role('owner')
  );

-- ── PRODUCTS ──
CREATE POLICY "products_select" ON products
  FOR SELECT USING (outlet_id = get_user_outlet_id());
CREATE POLICY "products_insert" ON products
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );
CREATE POLICY "products_update" ON products
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );
CREATE POLICY "products_delete" ON products
  FOR DELETE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_role('owner')
  );

-- ── SUPPLIERS ──
CREATE POLICY "suppliers_select" ON suppliers
  FOR SELECT USING (outlet_id = get_user_outlet_id());
CREATE POLICY "suppliers_insert" ON suppliers
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );
CREATE POLICY "suppliers_update" ON suppliers
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );

-- ── CUSTOMERS ──
CREATE POLICY "customers_select" ON customers
  FOR SELECT USING (outlet_id = get_user_outlet_id());
CREATE POLICY "customers_insert" ON customers
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id()
  );
CREATE POLICY "customers_update" ON customers
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

-- ── PURCHASES ──
CREATE POLICY "purchases_select" ON purchases
  FOR SELECT USING (outlet_id = get_user_outlet_id());
CREATE POLICY "purchases_insert" ON purchases
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );
CREATE POLICY "purchases_update" ON purchases
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );

-- ── PURCHASE ITEMS ──
CREATE POLICY "purchase_items_select" ON purchase_items
  FOR SELECT USING (
    purchase_id IN (SELECT id FROM purchases WHERE outlet_id = get_user_outlet_id())
  );
CREATE POLICY "purchase_items_insert" ON purchase_items
  FOR INSERT WITH CHECK (
    purchase_id IN (SELECT id FROM purchases WHERE outlet_id = get_user_outlet_id()) AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );

-- ── SALES ──
CREATE POLICY "sales_select" ON sales
  FOR SELECT USING (outlet_id = get_user_outlet_id());
CREATE POLICY "sales_insert" ON sales
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'cashier'])
  );
CREATE POLICY "sales_update" ON sales
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'cashier'])
  );

-- ── SALE ITEMS ──
CREATE POLICY "sale_items_select" ON sale_items
  FOR SELECT USING (
    sale_id IN (SELECT id FROM sales WHERE outlet_id = get_user_outlet_id())
  );
CREATE POLICY "sale_items_insert" ON sale_items
  FOR INSERT WITH CHECK (
    sale_id IN (SELECT id FROM sales WHERE outlet_id = get_user_outlet_id())
  );

-- ── AUDIT LOGS ──
CREATE POLICY "audit_logs_select_owner_manager" ON audit_logs
  FOR SELECT USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (true); -- Allow all authenticated users to insert

-- ── NOTIFICATIONS ──
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (
    user_id = auth.uid() OR
    (outlet_id = get_user_outlet_id() AND user_has_any_role(ARRAY['owner', 'manager']))
  );
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ── WASTE LOGS ──
CREATE POLICY "waste_logs_select" ON waste_logs
  FOR SELECT USING (outlet_id = get_user_outlet_id());
CREATE POLICY "waste_logs_insert" ON waste_logs
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );
CREATE POLICY "waste_logs_update" ON waste_logs
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

-- ── OPERATIONAL COSTS ──
CREATE POLICY "operational_costs_select" ON operational_costs
  FOR SELECT USING (outlet_id = get_user_outlet_id());
CREATE POLICY "operational_costs_insert" ON operational_costs
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'accounting'])
  );

-- ── RECIPE HEADERS ──
CREATE POLICY "recipe_headers_select" ON recipe_headers
  FOR SELECT USING (outlet_id = get_user_outlet_id());
CREATE POLICY "recipe_headers_insert" ON recipe_headers
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );
CREATE POLICY "recipe_headers_update" ON recipe_headers
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

-- ── RECIPE ITEMS ──
CREATE POLICY "recipe_items_select" ON recipe_items
  FOR SELECT USING (
    recipe_id IN (SELECT id FROM recipe_headers WHERE outlet_id = get_user_outlet_id())
  );
CREATE POLICY "recipe_items_insert" ON recipe_items
  FOR INSERT WITH CHECK (
    recipe_id IN (SELECT id FROM recipe_headers WHERE outlet_id = get_user_outlet_id())
  );
CREATE POLICY "recipe_items_update" ON recipe_items
  FOR UPDATE USING (
    recipe_id IN (SELECT id FROM recipe_headers WHERE outlet_id = get_user_outlet_id())
  );
CREATE POLICY "recipe_items_delete" ON recipe_items
  FOR DELETE USING (
    recipe_id IN (SELECT id FROM recipe_headers WHERE outlet_id = get_user_outlet_id())
  );

-- ── OPNAME ──
CREATE POLICY "opname_sessions_select" ON opname_sessions
  FOR SELECT USING (outlet_id = get_user_outlet_id());
CREATE POLICY "opname_sessions_insert" ON opname_sessions
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );
CREATE POLICY "opname_sessions_update" ON opname_sessions
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );

-- ── INVENTORY MOVEMENTS ──
CREATE POLICY "inventory_movements_select" ON inventory_movements
  FOR SELECT USING (outlet_id = get_user_outlet_id());
CREATE POLICY "inventory_movements_insert" ON inventory_movements
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );

-- ── LOYALTY REWARDS ──
CREATE POLICY "loyalty_rewards_select" ON loyalty_rewards
  FOR SELECT USING (outlet_id = get_user_outlet_id());
CREATE POLICY "loyalty_rewards_insert" ON loyalty_rewards
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND user_has_role('owner')
  );
CREATE POLICY "loyalty_rewards_update" ON loyalty_rewards
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND user_has_role('owner')
  );

-- ── ROLES ──
CREATE POLICY "roles_select" ON roles
  FOR SELECT USING (user_has_any_role(ARRAY['owner', 'manager']));

-- ── UNITS ──
CREATE POLICY "units_select" ON units
  FOR SELECT USING (true); -- Read-only for all authenticated users

-- ── CATEGORY TABLES ──
CREATE POLICY "ingredient_categories_select" ON ingredient_categories
  FOR SELECT USING (outlet_id = get_user_outlet_id());
CREATE POLICY "ingredient_categories_insert" ON ingredient_categories
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

CREATE POLICY "product_categories_select" ON product_categories
  FOR SELECT USING (outlet_id = get_user_outlet_id());
CREATE POLICY "product_categories_insert" ON product_categories
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PART 6: SEED DATA                                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── ROLES ──
INSERT INTO roles (name, description, permissions) VALUES
  ('owner', 'Full access to all features and settings', '{"all": true, "level": 100}'),
  ('manager', 'Manage operations, approve purchases and waste logs', '{"all": false, "level": 80, "modules": ["dashboard", "inventory", "products", "recipes", "purchases", "suppliers", "customers", "waste", "reports", "settings"]}'),
  ('cashier', 'POS access only — process sales and view products', '{"all": false, "level": 30, "modules": ["dashboard", "pos", "products", "customers"]}'),
  ('warehouse', 'Inventory management, stock opname, waste logs', '{"all": false, "level": 50, "modules": ["dashboard", "inventory", "purchases", "suppliers", "waste", "opname"]}'),
  ('accounting', 'Financial reports, operational costs, audit logs', '{"all": false, "level": 70, "modules": ["dashboard", "reports", "audit"]}'),
  ('admin', 'System administration and user management', '{"all": true, "level": 90}');

-- ── UNITS ──
INSERT INTO units (name, symbol, type) VALUES
  ('Kilogram', 'Kg', 'weight'),
  ('Gram', 'Gr', 'weight'),
  ('Liter', 'Ltr', 'volume'),
  ('Milliliter', 'Ml', 'volume'),
  ('Pieces', 'Pcs', 'pieces'),
  ('Bottle', 'Btl', 'package'),
  ('Pack', 'Pack', 'package'),
  ('Box', 'Box', 'package'),
  ('Sachet', 'Sct', 'package'),
  ('Meter', 'M', 'length');

-- ── DEMO OUTLET ──
INSERT INTO outlets (id, name, address, phone, email, tax_rate, service_charge_rate)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'ProStream Cafe — Main Branch',
  'Jl. Sudirman No. 45, Jakarta Pusat',
  '+62 21-555-0100',
  'main@prostream.cafe',
  11.00,
  0
);

-- ── INGREDIENT CATEGORIES ──
INSERT INTO ingredient_categories (id, outlet_id, name, color) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Daging & Protein', '#dc2626'),
  ('c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Bahan Pokok', '#2563eb'),
  ('c1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Bumbu', '#d97706'),
  ('c1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Dairy', '#059669'),
  ('c1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Coffee', '#7c3aed'),
  ('c1000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Seafood', '#0891b2'),
  ('c1000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Syrup', '#db2777'),
  ('c1000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Meat', '#b91c1c');

-- ── SUPPLIERS ──
INSERT INTO suppliers (id, outlet_id, name, phone, email, address, performance_score, total_orders, total_spend) VALUES
  ('s1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Fresh Farms Dairy', '+62 21-555-0101', 'procurement@freshfarms.co.id', 'Jl. Industri No. 45, Bekasi', 98, 45, 28500000),
  ('s1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Artisan Flour Mills', '+62 21-555-0202', 'sales@artisanflour.id', 'Kawasan Industri MM2100, Cikarang', 95, 32, 15200000),
  ('s1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Metro Meat Co.', '+62 21-555-0303', 'orders@metromeat.co.id', 'Pasar Besar, Jakarta Pusat', 92, 28, 42800000),
  ('s1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Diamond Cold Storage', '+62 21-555-0404', 'b2b@diamond.co.id', 'Jl. Raya Bogor KM 29, Depok', 89, 19, 35600000),
  ('s1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Kopitiam Roastery', '+62 21-555-0505', 'wholesale@kopitiam.id', 'Jl. Melawai VII, Blok M, Jakarta', 97, 22, 18900000);

-- ── INGREDIENTS ──
INSERT INTO ingredients (id, outlet_id, category_id, supplier_id, unit_id, name, sku, purchase_price, current_stock, min_stock) VALUES
  ('i1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 's1000000-0000-0000-0000-000000000001', (SELECT id FROM units WHERE symbol = 'Pcs'), 'Telur Ayam Boiler', 'EGG-001', 2100, 12, 30),
  ('i1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', NULL, (SELECT id FROM units WHERE symbol = 'Ltr'), 'Minyak Goreng Sawit', 'OIL-001', 14500, 145, 50),
  ('i1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', NULL, (SELECT id FROM units WHERE symbol = 'Kg'), 'Bawang Putih Kating', 'GAR-001', 38000, 5.4, 10),
  ('i1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 's1000000-0000-0000-0000-000000000001', (SELECT id FROM units WHERE symbol = 'Pack'), 'Heavy Cream 35%', 'CRM-001', 82000, 0, 4),
  ('i1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', NULL, (SELECT id FROM units WHERE symbol = 'Kg'), 'Tepung Terigu Pro Tinggi', 'FLR-001', 12800, 75, 20),
  ('i1000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 's1000000-0000-0000-0000-000000000001', (SELECT id FROM units WHERE symbol = 'Ltr'), 'Susu Full Cream (Diamond)', 'MLK-001', 16500, 2.5, 10),
  ('i1000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000005', 's1000000-0000-0000-0000-000000000005', (SELECT id FROM units WHERE symbol = 'Kg'), 'Espresso Roast (Arabica)', 'CFE-001', 145000, 1.2, 5),
  ('i1000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000007', NULL, (SELECT id FROM units WHERE symbol = 'Btl'), 'Caramel Syrup (Monin)', 'SYP-001', 125000, 1, 5),
  ('i1000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000008', 's1000000-0000-0000-0000-000000000003', (SELECT id FROM units WHERE symbol = 'Pcs'), 'Beef Patty Premium', 'BFP-001', 18500, 8, 50),
  ('i1000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', NULL, (SELECT id FROM units WHERE symbol = 'Ltr'), 'Cooking Oil', 'OIL-002', 14000, 5, 10),
  ('i1000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', NULL, (SELECT id FROM units WHERE symbol = 'Kg'), 'Gula Pasir', 'SGR-001', 16000, 42, 20),
  ('i1000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000006', NULL, (SELECT id FROM units WHERE symbol = 'Kg'), 'Salmon Fillet', 'SLM-001', 185000, 3.5, 5);

-- ── PRODUCT CATEGORIES ──
INSERT INTO product_categories (id, outlet_id, name, color, sort_order) VALUES
  ('pc1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Main Course', '#004ac6', 1),
  ('pc1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Beverages', '#059669', 2),
  ('pc1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Appetizers', '#d97706', 3),
  ('pc1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Desserts', '#bc4800', 4),
  ('pc1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Snacks', '#7c3aed', 5);

-- ── PRODUCTS ──
INSERT INTO products (id, outlet_id, category_id, name, selling_price, hpp, is_active, is_available) VALUES
  ('p1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'pc1000000-0000-0000-0000-000000000002', 'Iced Caramel Macchiato', 40000, 11200, true, true),
  ('p1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'pc1000000-0000-0000-0000-000000000001', 'Double Cheese Burger', 75000, 28500, true, true),
  ('p1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'pc1000000-0000-0000-0000-000000000005', 'Truffle Fries', 38000, 10640, true, true),
  ('p1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'pc1000000-0000-0000-0000-000000000002', 'Matcha Latte', 35000, 8750, true, true),
  ('p1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'pc1000000-0000-0000-0000-000000000001', 'Salmon Poke Bowl', 65000, 24700, true, true),
  ('p1000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'pc1000000-0000-0000-0000-000000000001', 'Margherita Pizza', 75000, 22500, true, true),
  ('p1000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'pc1000000-0000-0000-0000-000000000001', 'Baja Fish Tacos', 48000, 16800, true, true),
  ('p1000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'pc1000000-0000-0000-0000-000000000004', 'Lava Cake', 42000, 12600, true, true),
  ('p1000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'pc1000000-0000-0000-0000-000000000001', 'Chicken Salad', 52000, 18200, true, false),
  ('p1000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'pc1000000-0000-0000-0000-000000000003', 'Spring Rolls', 28000, 7560, true, true),
  ('p1000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'pc1000000-0000-0000-0000-000000000004', 'Tiramisu', 45000, 13500, false, false),
  ('p1000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'pc1000000-0000-0000-0000-000000000001', 'Signature Burger', 58000, 20300, true, true);

-- ── RECIPES (Beng-Beng Ice) ──
-- First, create a recipe header
INSERT INTO recipe_headers (id, outlet_id, product_id, version, status, total_hpp)
VALUES (
  'r1000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'p1000000-0000-0000-0000-000000000001',
  1, 'active', 4200
);

INSERT INTO recipe_items (recipe_id, ingredient_id, quantity, unit_id, unit_cost, sort_order)
VALUES
  ('r1000000-0000-0000-0000-000000000001', 'i1000000-0000-0000-0000-000000000008', 1, (SELECT id FROM units WHERE symbol = 'Btl'), 125000, 1),
  ('r1000000-0000-0000-0000-000000000001', 'i1000000-0000-0000-0000-000000000006', 0.03, (SELECT id FROM units WHERE symbol = 'Ltr'), 16500, 2);

-- ── LOYALTY REWARDS ──
INSERT INTO loyalty_rewards (outlet_id, name, description, points_required, reward_type, reward_value, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Free Coffee', 'Redeem any regular coffee beverage', 1000, 'free_item', NULL, true),
  ('a0000000-0000-0000-0000-000000000001', '25% Off Meal', 'Get 25% discount on your entire meal', 5000, 'discount', 25, true),
  ('a0000000-0000-0000-0000-000000000001', 'Free Dessert', 'Choose any dessert from the menu', 2000, 'free_item', NULL, true);

-- Final: Enable pg_trgm for text search if available
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION
  WHEN OTHERS THEN NULL; -- Extension may not be available on all platforms
END $$;