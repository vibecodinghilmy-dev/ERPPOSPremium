-- ============================================================================
-- ProStream ERP F&B — Enterprise Data Model Hardening
-- Version: 1.0.0 (Additive Migration)
-- Description: Adds enterprise structures for HPP engine, production engine,
--              forecast engine, multi-outlet inventory, and franchise expansion
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  NEW ENUMS                                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Transfer statuses for inter-outlet stock movement
CREATE TYPE transfer_status AS ENUM (
  'draft', 'requested', 'approved', 'in_transit', 'received', 'cancelled'
);

-- Product type to distinguish finished goods from semi-finished
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'transfer_out';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'transfer_in';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'production_consumption';
ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'packaging';

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  UNIT CONVERSIONS — HPP Engine                                        ║
-- ║  Enables accurate cost calculation across different units of measure   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE unit_conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  from_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  to_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  conversion_factor NUMERIC(15,6) NOT NULL CHECK (conversion_factor > 0),
  is_exact BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, from_unit_id, to_unit_id),
  CHECK (from_unit_id <> to_unit_id)
);

-- ── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX idx_unit_conversions_outlet ON unit_conversions(outlet_id);
CREATE INDEX idx_unit_conversions_from ON unit_conversions(from_unit_id);
CREATE INDEX idx_unit_conversions_to ON unit_conversions(to_unit_id);

-- ── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE unit_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "unit_conversions_select" ON unit_conversions
  FOR SELECT USING (outlet_id = get_user_outlet_id());

CREATE POLICY "unit_conversions_insert" ON unit_conversions
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

CREATE POLICY "unit_conversions_update" ON unit_conversions
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

CREATE POLICY "unit_conversions_delete" ON unit_conversions
  FOR DELETE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_role('owner')
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PACKAGING ITEMS — Production Engine                                  ║
-- ║  Tracks packaging materials (cups, boxes, bags, labels)              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE packaging_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  description TEXT,
  purchase_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_stock NUMERIC(15,3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(15,3) NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, name)
);

-- ── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX idx_packaging_items_outlet ON packaging_items(outlet_id);
CREATE INDEX idx_packaging_items_supplier ON packaging_items(supplier_id);
CREATE INDEX idx_packaging_items_sku ON packaging_items(sku);
CREATE INDEX idx_packaging_items_active ON packaging_items(is_active);

-- ── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE packaging_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packaging_items_select" ON packaging_items
  FOR SELECT USING (outlet_id = get_user_outlet_id());

CREATE POLICY "packaging_items_insert" ON packaging_items
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );

CREATE POLICY "packaging_items_update" ON packaging_items
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );

CREATE POLICY "packaging_items_delete" ON packaging_items
  FOR DELETE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_role('owner')
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PACKAGING COSTS — HPP Engine                                         ║
-- ║  Links packaging materials to products with quantity per unit         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE packaging_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  packaging_item_id UUID NOT NULL REFERENCES packaging_items(id) ON DELETE RESTRICT,
  quantity_per_product NUMERIC(15,3) NOT NULL CHECK (quantity_per_product > 0),
  unit_cost_at_calculation NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_packaging_hpp NUMERIC(15,2) GENERATED ALWAYS AS (quantity_per_product * unit_cost_at_calculation) STORED,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, packaging_item_id)
);

-- ── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX idx_packaging_costs_outlet ON packaging_costs(outlet_id);
CREATE INDEX idx_packaging_costs_product ON packaging_costs(product_id);
CREATE INDEX idx_packaging_costs_item ON packaging_costs(packaging_item_id);

-- ── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE packaging_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packaging_costs_select" ON packaging_costs
  FOR SELECT USING (outlet_id = get_user_outlet_id());

CREATE POLICY "packaging_costs_insert" ON packaging_costs
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

CREATE POLICY "packaging_costs_update" ON packaging_costs
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

CREATE POLICY "packaging_costs_delete" ON packaging_costs
  FOR DELETE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_role('owner')
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SEMI-FINISHED PRODUCTS — Production Engine                           ║
-- ║  Intermediate products (dough, sauce, stock) used in final recipes    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE semi_finished_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  description TEXT,
  current_stock NUMERIC(15,3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(15,3) NOT NULL DEFAULT 0,
  standard_yield DECIMAL(5,2) NOT NULL DEFAULT 100.00 CHECK (standard_yield > 0 AND standard_yield <= 100),
  -- standard_yield: percentage yield from production (e.g., 85% after cooking loss)
  shelf_life_days INTEGER CHECK (shelf_life_days > 0),
  storage_instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, name)
);

-- ── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX idx_semi_finished_outlet ON semi_finished_products(outlet_id);
CREATE INDEX idx_semi_finished_sku ON semi_finished_products(sku);
CREATE INDEX idx_semi_finished_active ON semi_finished_products(is_active);

-- ── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE semi_finished_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "semi_finished_select" ON semi_finished_products
  FOR SELECT USING (outlet_id = get_user_outlet_id());

CREATE POLICY "semi_finished_insert" ON semi_finished_products
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

CREATE POLICY "semi_finished_update" ON semi_finished_products
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );

CREATE POLICY "semi_finished_delete" ON semi_finished_products
  FOR DELETE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_role('owner')
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SEMI-FINISHED RECIPE ITEMS — HPP Engine                              ║
-- ║  Ingredients that make up semi-finished products (BOM level 1)        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE semi_finished_recipe_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  semi_finished_id UUID NOT NULL REFERENCES semi_finished_products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE RESTRICT,
  -- ingredient_id OR sub_semi_finished_id must be set (not both)
  sub_semi_finished_id UUID REFERENCES semi_finished_products(id) ON DELETE RESTRICT,
  quantity NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_single_component CHECK (
    (ingredient_id IS NOT NULL AND sub_semi_finished_id IS NULL) OR
    (ingredient_id IS NULL AND sub_semi_finished_id IS NOT NULL)
  )
);

-- ── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX idx_semi_finished_recipe_outlet ON semi_finished_recipe_items(outlet_id);
CREATE INDEX idx_semi_finished_recipe_parent ON semi_finished_recipe_items(semi_finished_id);
CREATE INDEX idx_semi_finished_recipe_ingredient ON semi_finished_recipe_items(ingredient_id);
CREATE INDEX idx_semi_finished_recipe_sub ON semi_finished_recipe_items(sub_semi_finished_id);

-- ── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE semi_finished_recipe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "semi_finished_recipe_select" ON semi_finished_recipe_items
  FOR SELECT USING (outlet_id = get_user_outlet_id());

CREATE POLICY "semi_finished_recipe_insert" ON semi_finished_recipe_items
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

CREATE POLICY "semi_finished_recipe_update" ON semi_finished_recipe_items
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

CREATE POLICY "semi_finished_recipe_delete" ON semi_finished_recipe_items
  FOR DELETE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SALE ITEM HPP SNAPSHOTS — HPP Engine                                 ║
-- ║  Frozen HPP data at the moment of sale for accurate margin analysis   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE sale_item_hpp_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  ingredient_hpp NUMERIC(15,2) NOT NULL DEFAULT 0,
  packaging_hpp NUMERIC(15,2) NOT NULL DEFAULT 0,
  labor_overhead_hpp NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_hpp_per_unit NUMERIC(15,2) GENERATED ALWAYS AS (
    ingredient_hpp + packaging_hpp + labor_overhead_hpp
  ) STORED,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_hpp NUMERIC(15,2) GENERATED ALWAYS AS (
    (ingredient_hpp + packaging_hpp + labor_overhead_hpp) * quantity
  ) STORED,
  recipe_version INTEGER,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sale_item_id)
);

-- ── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX idx_sale_hpp_snapshots_outlet ON sale_item_hpp_snapshots(outlet_id);
CREATE INDEX idx_sale_hpp_snapshots_sale ON sale_item_hpp_snapshots(sale_id);
CREATE INDEX idx_sale_hpp_snapshots_product ON sale_item_hpp_snapshots(product_id);
CREATE INDEX idx_sale_hpp_snapshots_calculated ON sale_item_hpp_snapshots(calculated_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE sale_item_hpp_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_hpp_snapshots_select" ON sale_item_hpp_snapshots
  FOR SELECT USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'accounting'])
  );

CREATE POLICY "sale_hpp_snapshots_insert" ON sale_item_hpp_snapshots
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'cashier'])
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SALE ITEM PROFIT SNAPSHOTS — HPP Engine                              ║
-- ║  Frozen profit data at the moment of sale for margin analysis         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE sale_item_profit_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit_hpp NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit_profit NUMERIC(15,2) GENERATED ALWAYS AS (unit_price - unit_hpp) STORED,
  unit_margin_percent NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN unit_price > 0
      THEN ROUND(((unit_price - unit_hpp) / unit_price * 100)::numeric, 2)
      ELSE 0
    END
  ) STORED,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_profit NUMERIC(15,2) GENERATED ALWAYS AS ((unit_price - unit_hpp) * quantity) STORED,
  total_revenue NUMERIC(15,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  net_revenue NUMERIC(15,2) GENERATED ALWAYS AS ((unit_price * quantity) - discount_amount) STORED,
  net_profit NUMERIC(15,2) GENERATED ALWAYS AS (((unit_price - unit_hpp) * quantity) - discount_amount) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sale_item_id)
);

-- ── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX idx_sale_profit_snapshots_outlet ON sale_item_profit_snapshots(outlet_id);
CREATE INDEX idx_sale_profit_snapshots_sale ON sale_item_profit_snapshots(sale_id);
CREATE INDEX idx_sale_profit_snapshots_product ON sale_item_profit_snapshots(product_id);
CREATE INDEX idx_sale_profit_snapshots_margin ON sale_item_profit_snapshots(unit_margin_percent);
CREATE INDEX idx_sale_profit_snapshots_created ON sale_item_profit_snapshots(created_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE sale_item_profit_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_profit_snapshots_select" ON sale_item_profit_snapshots
  FOR SELECT USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'accounting'])
  );

CREATE POLICY "sale_profit_snapshots_insert" ON sale_item_profit_snapshots
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'cashier'])
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  INVENTORY DAILY SNAPSHOTS — Forecast Engine                          ║
-- ║  Daily stock levels for trend analysis and consumption patterns       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE inventory_daily_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_stock NUMERIC(15,3) NOT NULL DEFAULT 0,
  purchases_in NUMERIC(15,3) NOT NULL DEFAULT 0,
  transfers_in NUMERIC(15,3) NOT NULL DEFAULT 0,
  sales_out NUMERIC(15,3) NOT NULL DEFAULT 0,
  waste_out NUMERIC(15,3) NOT NULL DEFAULT 0,
  production_out NUMERIC(15,3) NOT NULL DEFAULT 0,
  transfers_out NUMERIC(15,3) NOT NULL DEFAULT 0,
  adjustments NUMERIC(15,3) NOT NULL DEFAULT 0,
  closing_stock NUMERIC(15,3) NOT NULL DEFAULT 0,
  average_unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  daily_usage_rate NUMERIC(15,3) NOT NULL DEFAULT 0,
  days_until_stockout INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, ingredient_id, snapshot_date)
);

-- ── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX idx_inventory_daily_outlet ON inventory_daily_snapshots(outlet_id);
CREATE INDEX idx_inventory_daily_ingredient ON inventory_daily_snapshots(ingredient_id);
CREATE INDEX idx_inventory_daily_date ON inventory_daily_snapshots(snapshot_date DESC);
CREATE INDEX idx_inventory_daily_stockout ON inventory_daily_snapshots(days_until_stockout)
  WHERE days_until_stockout IS NOT NULL;
CREATE INDEX idx_inventory_daily_closing ON inventory_daily_snapshots(outlet_id, ingredient_id, snapshot_date DESC);

-- ── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE inventory_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_daily_select" ON inventory_daily_snapshots
  FOR SELECT USING (outlet_id = get_user_outlet_id());

CREATE POLICY "inventory_daily_insert" ON inventory_daily_snapshots
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  STOCK FORECASTS — Forecast Engine                                    ║
-- ║  Predicted stock levels based on historical usage patterns            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE stock_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  predicted_opening NUMERIC(15,3) NOT NULL DEFAULT 0,
  predicted_purchases NUMERIC(15,3) NOT NULL DEFAULT 0,
  predicted_consumption NUMERIC(15,3) NOT NULL DEFAULT 0,
  predicted_closing NUMERIC(15,3) NOT NULL DEFAULT 0,
  reorder_point NUMERIC(15,3) NOT NULL DEFAULT 0,
  suggested_order_quantity NUMERIC(15,3) NOT NULL DEFAULT 0,
  confidence_score NUMERIC(3,2) DEFAULT NULL CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  forecast_method VARCHAR(50) DEFAULT 'moving_average', -- 'moving_average', 'exponential', 'ml_model', 'manual'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, ingredient_id, forecast_date)
);

-- ── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX idx_stock_forecasts_outlet ON stock_forecasts(outlet_id);
CREATE INDEX idx_stock_forecasts_ingredient ON stock_forecasts(ingredient_id);
CREATE INDEX idx_stock_forecasts_date ON stock_forecasts(forecast_date);
CREATE INDEX idx_stock_forecasts_active ON stock_forecasts(is_active)
  WHERE is_active = true;
CREATE INDEX idx_stock_forecasts_reorder ON stock_forecasts(outlet_id, ingredient_id, forecast_date DESC)
  WHERE reorder_point > 0;

-- ── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE stock_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_forecasts_select" ON stock_forecasts
  FOR SELECT USING (outlet_id = get_user_outlet_id());

CREATE POLICY "stock_forecasts_insert" ON stock_forecasts
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );

CREATE POLICY "stock_forecasts_update" ON stock_forecasts
  FOR UPDATE USING (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  OUTLET TRANSFERS — Multi-Outlet & Franchise Inventory                ║
-- ║  Stock transfers between outlets with full audit trail                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE outlet_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_number VARCHAR(50) NOT NULL,
  source_outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
  destination_outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
  status transfer_status NOT NULL DEFAULT 'draft',
  total_items INTEGER NOT NULL DEFAULT 0,
  total_estimated_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  shipped_by UUID REFERENCES users(id) ON DELETE SET NULL,
  received_by UUID REFERENCES users(id) ON DELETE SET NULL,
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_different_outlets CHECK (source_outlet_id <> destination_outlet_id)
);

-- ── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX idx_outlet_transfers_source ON outlet_transfers(source_outlet_id);
CREATE INDEX idx_outlet_transfers_dest ON outlet_transfers(destination_outlet_id);
CREATE INDEX idx_outlet_transfers_status ON outlet_transfers(status);
CREATE INDEX idx_outlet_transfers_created ON outlet_transfers(created_at DESC);
CREATE INDEX idx_outlet_transfers_number ON outlet_transfers(transfer_number);

-- ── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE outlet_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outlet_transfers_select" ON outlet_transfers
  FOR SELECT USING (
    source_outlet_id = get_user_outlet_id() OR
    destination_outlet_id = get_user_outlet_id()
  );

CREATE POLICY "outlet_transfers_insert" ON outlet_transfers
  FOR INSERT WITH CHECK (
    source_outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );

CREATE POLICY "outlet_transfers_update" ON outlet_transfers
  FOR UPDATE USING (
    source_outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager'])
  );

-- TRANSFER ITEMS — Individual ingredients within a transfer
CREATE TABLE transfer_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES outlet_transfers(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(15,3) NOT NULL CHECK (quantity > 0),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  received_quantity NUMERIC(15,3),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX idx_transfer_items_transfer ON transfer_items(transfer_id);
CREATE INDEX idx_transfer_items_ingredient ON transfer_items(ingredient_id);

-- ── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transfer_items_select" ON transfer_items
  FOR SELECT USING (
    transfer_id IN (
      SELECT id FROM outlet_transfers
      WHERE source_outlet_id = get_user_outlet_id()
         OR destination_outlet_id = get_user_outlet_id()
    )
  );

CREATE POLICY "transfer_items_insert" ON transfer_items
  FOR INSERT WITH CHECK (
    transfer_id IN (
      SELECT id FROM outlet_transfers
      WHERE source_outlet_id = get_user_outlet_id()
    ) AND user_has_any_role(ARRAY['owner', 'manager', 'warehouse'])
  );

CREATE POLICY "transfer_items_update" ON transfer_items
  FOR UPDATE USING (
    transfer_id IN (
      SELECT id FROM outlet_transfers
      WHERE source_outlet_id = get_user_outlet_id()
    ) AND user_has_any_role(ARRAY['owner', 'manager'])
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  TRIGGERS                                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Auto-update updated_at for new tables
CREATE TRIGGER update_unit_conversions_updated_at
  BEFORE UPDATE ON unit_conversions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_packaging_items_updated_at
  BEFORE UPDATE ON packaging_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_packaging_costs_updated_at
  BEFORE UPDATE ON packaging_costs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_semi_finished_products_updated_at
  BEFORE UPDATE ON semi_finished_products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_outlet_transfers_updated_at
  BEFORE UPDATE ON outlet_transfers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_stock_forecasts_updated_at
  BEFORE UPDATE ON stock_forecasts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate transfer number
CREATE SEQUENCE IF NOT EXISTS transfer_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.transfer_number := 'TRF-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(NEXTVAL('transfer_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_transfer_number
  BEFORE INSERT ON outlet_transfers FOR EACH ROW
  WHEN (NEW.transfer_number IS NULL OR NEW.transfer_number = '')
  EXECUTE FUNCTION generate_transfer_number();

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  SEED DATA — Sample conversions, packaging, semi-finished              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Unit conversions (for demo outlet)
INSERT INTO unit_conversions (outlet_id, from_unit_id, to_unit_id, conversion_factor, is_exact)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  u1.id, u2.id, factor, exact
FROM (
  VALUES
    ('Kg', 'Gr', 1000.000000, true),
    ('Ltr', 'Ml', 1000.000000, true),
    ('Kg', 'Ltr', 0.850000, false),  -- approximate: 1kg flour ≈ 0.85L
    ('Ml', 'Ltr', 0.001000, true),
    ('Gr', 'Kg', 0.001000, true)
) AS v(from_sym, to_sym, factor, exact)
JOIN units u1 ON u1.symbol = v.from_sym
JOIN units u2 ON u2.symbol = v.to_sym;