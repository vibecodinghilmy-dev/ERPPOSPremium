-- ============================================================================
-- ProStream ERP F&B — Production Critical Fixes
-- Version: 1.0.0
-- Fixes: CR-1 (RPC transactions), CR-2 (atomic stock), CR-4 (idempotency)
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CR-4: IDEMPOTENCY KEY                                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE sales ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) UNIQUE;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CR-2: ATOMIC STOCK UPDATE FUNCTION                                    ║
-- ║  UPDATE ... SET current_stock = current_stock + delta                  ║
-- ║  WHERE id = $1 AND current_stock + delta >= 0                          ║
-- ║  Prevents read-modify-write race condition                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION atomic_adjust_stock(
  p_ingredient_id UUID,
  p_delta NUMERIC(15,3),
  p_outlet_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_stock NUMERIC(15,3),
  old_stock NUMERIC(15,3)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_stock NUMERIC(15,3);
  v_new_stock NUMERIC(15,3);
BEGIN
  -- Lock the row and read current stock
  SELECT current_stock INTO v_old_stock
  FROM ingredients
  WHERE id = p_ingredient_id
  AND (p_outlet_id IS NULL OR outlet_id = p_outlet_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::NUMERIC(15,3), 0::NUMERIC(15,3);
    RETURN;
  END IF;

  v_new_stock := v_old_stock + p_delta;

  -- Prevent negative stock
  IF v_new_stock < 0 THEN
    RETURN QUERY SELECT false, v_old_stock, v_old_stock;
    RETURN;
  END IF;

  -- Atomic update
  UPDATE ingredients
  SET current_stock = v_new_stock,
      updated_at = NOW()
  WHERE id = p_ingredient_id;

  RETURN QUERY SELECT true, v_new_stock, v_old_stock;
END;
$$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CR-1: CREATE SALE TRANSACTION (ATOMIC)                                ║
-- ║  Wraps the entire POS flow in a single PostgreSQL transaction          ║
-- ║  Sale → Sale Items → Inventory → HPP Snapshot → Profit → Audit        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TYPE sale_item_input AS (
  product_id UUID,
  product_name VARCHAR(255),
  quantity INTEGER,
  unit_price NUMERIC(15,2),
  discount_amount NUMERIC(15,2),
  hpp_at_sale NUMERIC(15,2)
);

CREATE TYPE recipe_consumption_item AS (
  ingredient_id UUID,
  quantity NUMERIC(15,3)
);

CREATE OR REPLACE FUNCTION create_sale_transaction(
  p_outlet_id UUID,
  p_user_id UUID,
  p_idempotency_key VARCHAR(255),
  p_customer_id UUID,
  p_order_type order_type,
  p_payment_method payment_method,
  p_discount_amount NUMERIC(15,2),
  p_tax_rate NUMERIC(5,2),
  p_service_charge_rate NUMERIC(5,2),
  p_table_number VARCHAR(10),
  p_notes TEXT,
  p_items sale_item_input[]
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale_id UUID;
  v_sale_number VARCHAR(50);
  v_subtotal NUMERIC(15,2) := 0;
  v_tax_amount NUMERIC(15,2) := 0;
  v_service_charge NUMERIC(15,2) := 0;
  v_total_amount NUMERIC(15,2) := 0;
  v_total_hpp NUMERIC(15,2) := 0;
  v_item sale_item_input;
  v_movement_ids UUID[] := '{}';
  v_audit_ids UUID[] := '{}';
  v_movement_id UUID;
  v_audit_id UUID;
  v_recipe recipe_consumption_item[];
  v_recipe_item recipe_consumption_item;
  v_ingredient_stock NUMERIC(15,3);
  v_stock_ok BOOLEAN;
  v_hpp_snapshot_id UUID;
  v_profit_snapshot_id UUID;
  v_warnings JSONB := '[]'::JSONB;
BEGIN
  -- ── Check idempotency (CR-4) ──────────────────────────────────
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, sale_number INTO v_sale_id, v_sale_number
    FROM sales
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'sale_number', v_sale_number,
        'idempotent', true
      );
    END IF;
  END IF;

  -- ── Start Transaction ─────────────────────────────────────────
  -- (Already in a transaction block when called via SELECT)

  -- Calculate totals
  v_subtotal := 0;
  FOREACH v_item IN ARRAY p_items
  LOOP
    v_subtotal := v_subtotal + (v_item.unit_price * v_item.quantity);
    v_total_hpp := v_total_hpp + (v_item.hpp_at_sale * v_item.quantity);
  END LOOP;

  v_tax_amount := v_subtotal * (p_tax_rate / 100);
  v_service_charge := v_subtotal * (p_service_charge_rate / 100);
  v_total_amount := v_subtotal + v_tax_amount + v_service_charge - p_discount_amount;

  -- ── Step 1: Create Sale ───────────────────────────────────────
  INSERT INTO sales (
    outlet_id, customer_id, order_type, status,
    subtotal, tax_amount, discount_amount, service_charge,
    total_amount, payment_method, table_number, notes,
    created_by, idempotency_key
  ) VALUES (
    p_outlet_id, p_customer_id, p_order_type, 'completed',
    v_subtotal, v_tax_amount, p_discount_amount, v_service_charge,
    v_total_amount, p_payment_method, p_table_number, p_notes,
    p_user_id, p_idempotency_key
  )
  RETURNING id, sale_number INTO v_sale_id, v_sale_number;

  -- ── Step 2: Create Sale Items & Consume Inventory ─────────────
  FOREACH v_item IN ARRAY p_items
  LOOP
    -- Insert sale item
    INSERT INTO sale_items (
      sale_id, product_id, quantity, unit_price,
      discount_amount, total_price, hpp_at_sale
    ) VALUES (
      v_sale_id, v_item.product_id, v_item.quantity, v_item.unit_price,
      v_item.discount_amount,
      (v_item.unit_price * v_item.quantity) - v_item.discount_amount,
      v_item.hpp_at_sale
    );

    -- Get recipe consumption for this product
    -- This uses the recipe_items table to find ingredient quantities
    FOR v_recipe_item IN
      SELECT ri.ingredient_id, ri.quantity * v_item.quantity
      FROM recipe_items ri
      JOIN recipe_headers rh ON rh.id = ri.recipe_id
      WHERE rh.product_id = v_item.product_id
      AND rh.status = 'active'
      ORDER BY rh.version DESC
      LIMIT 1
    LOOP
      -- ── Step 3: Atomic Stock Deduction (CR-2) ─────────────────
      SELECT success, new_stock INTO v_stock_ok, v_ingredient_stock
      FROM atomic_adjust_stock(
        v_recipe_item.ingredient_id,
        -v_recipe_item.quantity,
        p_outlet_id
      );

      IF NOT v_stock_ok THEN
        -- Insufficient stock — add warning but continue
        v_warnings := v_warnings || jsonb_build_object(
          'type', 'insufficient_stock',
          'message', 'Insufficient stock for ingredient ' || v_recipe_item.ingredient_id,
          'severity', 'warning'
        );
      END IF;

      -- Record inventory movement
      INSERT INTO inventory_movements (
        outlet_id, ingredient_id, movement_type, quantity,
        unit_cost, total_cost, reference_id, reference_type,
        notes, created_by
      ) VALUES (
        p_outlet_id, v_recipe_item.ingredient_id, 'sale',
        -v_recipe_item.quantity, v_item.hpp_at_sale,
        v_recipe_item.quantity * v_item.hpp_at_sale,
        v_sale_id, 'sale',
        'Consumed for ' || v_item.product_name || ' x' || v_item.quantity,
        p_user_id
      )
      RETURNING id INTO v_movement_id;

      v_movement_ids := array_append(v_movement_ids, v_movement_id);
    END LOOP;
  END LOOP;

  -- ── Step 4: Create HPP Snapshots ──────────────────────────────
  INSERT INTO sale_item_hpp_snapshots (
    outlet_id, sale_item_id, sale_id, product_id,
    ingredient_hpp, packaging_hpp, labor_overhead_hpp,
    quantity, recipe_version
  )
  SELECT
    p_outlet_id, si.id, v_sale_id, si.product_id,
    si.hpp_at_sale, 0, 0,
    si.quantity, NULL
  FROM sale_items si
  WHERE si.sale_id = v_sale_id;

  -- ── Step 5: Create Profit Snapshots ───────────────────────────
  INSERT INTO sale_item_profit_snapshots (
    outlet_id, sale_item_id, sale_id, product_id,
    unit_price, unit_hpp, quantity, discount_amount
  )
  SELECT
    p_outlet_id, si.id, v_sale_id, si.product_id,
    si.unit_price, si.hpp_at_sale, si.quantity,
    si.discount_amount
  FROM sale_items si
  WHERE si.sale_id = v_sale_id;

  -- ── Step 6: Create Audit Log ──────────────────────────────────
  INSERT INTO audit_logs (
    outlet_id, user_id, module, action,
    entity_type, entity_id, entity_label, after_value
  ) VALUES (
    p_outlet_id, p_user_id, 'pos', 'create',
    'sale', v_sale_id, v_sale_number,
    jsonb_build_object(
      'total_amount', v_total_amount,
      'item_count', array_length(p_items, 1),
      'payment_method', p_payment_method
    )
  )
  RETURNING id INTO v_audit_id;

  v_audit_ids := array_append(v_audit_ids, v_audit_id);

  -- ── Commit (automatic, we're in a function) ──────────────────
  -- Any exception above will automatically roll back

  RETURN jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'sale_number', v_sale_number,
    'subtotal', v_subtotal,
    'tax_amount', v_tax_amount,
    'discount_amount', p_discount_amount,
    'total_amount', v_total_amount,
    'total_hpp', v_total_hpp,
    'movement_ids', v_movement_ids,
    'audit_ids', v_audit_ids,
    'warnings', v_warnings,
    'idempotent', false
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE,
    'sale_id', NULL
  );
END;
$$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CR-1: ATOMIC TRANSFER FUNCTION                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TYPE transfer_item_input AS (
  ingredient_id UUID,
  quantity NUMERIC(15,3),
  unit_cost NUMERIC(15,2)
);

CREATE OR REPLACE FUNCTION execute_transfer(
  p_source_outlet_id UUID,
  p_destination_outlet_id UUID,
  p_requested_by UUID,
  p_notes TEXT,
  p_items transfer_item_input[]
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_transfer_id UUID;
  v_item transfer_item_input;
  v_stock_ok BOOLEAN;
  v_movement_ids UUID[] := '{}';
  v_total_value NUMERIC(15,2) := 0;
BEGIN
  -- Create transfer record
  INSERT INTO outlet_transfers (
    source_outlet_id, destination_outlet_id, status,
    total_items, requested_by, notes
  ) VALUES (
    p_source_outlet_id, p_destination_outlet_id, 'in_transit',
    array_length(p_items, 1), p_requested_by, p_notes
  )
  RETURNING id INTO v_transfer_id;

  -- Process each item atomically
  FOREACH v_item IN ARRAY p_items
  LOOP
    v_total_value := v_total_value + (v_item.quantity * v_item.unit_cost);

    -- Deduct from source (atomic)
    SELECT success INTO v_stock_ok
    FROM atomic_adjust_stock(v_item.ingredient_id, -v_item.quantity, p_source_outlet_id);

    IF NOT v_stock_ok THEN
      RAISE EXCEPTION 'Insufficient stock for ingredient % at source outlet', v_item.ingredient_id;
    END IF;

    -- Add to destination (atomic)
    PERFORM atomic_adjust_stock(v_item.ingredient_id, v_item.quantity, p_destination_outlet_id);

    -- Record source movement
    INSERT INTO inventory_movements (
      outlet_id, ingredient_id, movement_type, quantity,
      unit_cost, total_cost, reference_id, reference_type,
      notes, created_by
    ) VALUES (
      p_source_outlet_id, v_item.ingredient_id, 'transfer_out',
      -v_item.quantity, v_item.unit_cost, v_item.quantity * v_item.unit_cost,
      v_transfer_id, 'transfer',
      'Transfer out to ' || p_destination_outlet_id,
      p_requested_by
    );

    -- Record destination movement
    INSERT INTO inventory_movements (
      outlet_id, ingredient_id, movement_type, quantity,
      unit_cost, total_cost, reference_id, reference_type,
      notes, created_by
    ) VALUES (
      p_destination_outlet_id, v_item.ingredient_id, 'transfer_in',
      v_item.quantity, v_item.unit_cost, v_item.quantity * v_item.unit_cost,
      v_transfer_id, 'transfer',
      'Transfer in from ' || p_source_outlet_id,
      p_requested_by
    );

    -- Create transfer item record
    INSERT INTO transfer_items (transfer_id, ingredient_id, quantity, unit_id, unit_cost)
    VALUES (v_transfer_id, v_item.ingredient_id, v_item.quantity,
      (SELECT unit_id FROM ingredients WHERE id = v_item.ingredient_id),
      v_item.unit_cost);
  END LOOP;

  -- Update transfer totals
  UPDATE outlet_transfers
  SET total_estimated_value = v_total_value
  WHERE id = v_transfer_id;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'transfer_number', (SELECT transfer_number FROM outlet_transfers WHERE id = v_transfer_id),
    'total_value', v_total_value
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  CR-2: ATOMIC WASTE RECORDING                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION record_waste_transaction(
  p_outlet_id UUID,
  p_ingredient_id UUID,
  p_quantity NUMERIC(15,3),
  p_reason TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_ingredient RECORD;
  v_stock_ok BOOLEAN;
  v_new_stock NUMERIC(15,3);
  v_movement_id UUID;
  v_waste_id UUID;
  v_unit_cost NUMERIC(15,2);
BEGIN
  -- Get ingredient info
  SELECT id, name, purchase_price, current_stock INTO v_ingredient
  FROM ingredients WHERE id = p_ingredient_id AND outlet_id = p_outlet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ingredient not found');
  END IF;

  v_unit_cost := v_ingredient.purchase_price;

  -- Atomic stock deduction
  SELECT success, new_stock INTO v_stock_ok, v_new_stock
  FROM atomic_adjust_stock(p_ingredient_id, -p_quantity, p_outlet_id);

  IF NOT v_stock_ok THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient stock: have ' || v_ingredient.current_stock || ', need ' || p_quantity
    );
  END IF;

  -- Create waste log
  INSERT INTO waste_logs (
    outlet_id, ingredient_id, quantity, unit_id,
    unit_cost, total_cost, reason, status, created_by
  ) VALUES (
    p_outlet_id, p_ingredient_id, p_quantity,
    (SELECT unit_id FROM ingredients WHERE id = p_ingredient_id),
    v_unit_cost, p_quantity * v_unit_cost, p_reason,
    'approved', p_user_id
  )
  RETURNING id INTO v_waste_id;

  -- Record inventory movement
  INSERT INTO inventory_movements (
    outlet_id, ingredient_id, movement_type, quantity,
    unit_cost, total_cost, reference_id, reference_type,
    notes, created_by
  ) VALUES (
    p_outlet_id, p_ingredient_id, 'waste',
    -p_quantity, v_unit_cost, p_quantity * v_unit_cost,
    v_waste_id, 'waste', 'Waste: ' || p_reason, p_user_id
  )
  RETURNING id INTO v_movement_id;

  RETURN jsonb_build_object(
    'success', true,
    'waste_id', v_waste_id,
    'movement_id', v_movement_id,
    'new_stock', v_new_stock
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  STOCK RECONCILIATION FUNCTION                                          ║
-- ║  Detects discrepancies between inventory_movements and current_stock   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION reconcile_inventory(p_outlet_id UUID)
RETURNS TABLE (
  ingredient_id UUID,
  ingredient_name VARCHAR(255),
  current_stock NUMERIC(15,3),
  calculated_stock NUMERIC(15,3),
  discrepancy NUMERIC(15,3),
  discrepancy_value NUMERIC(15,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.current_stock,
    COALESCE(m.calculated_stock, 0) AS calculated_stock,
    i.current_stock - COALESCE(m.calculated_stock, 0) AS discrepancy,
    (i.current_stock - COALESCE(m.calculated_stock, 0)) * i.purchase_price AS discrepancy_value
  FROM ingredients i
  LEFT JOIN (
    SELECT
      im.ingredient_id,
      SUM(im.quantity) AS calculated_stock
    FROM inventory_movements im
    WHERE im.outlet_id = p_outlet_id
    GROUP BY im.ingredient_id
  ) m ON m.ingredient_id = i.id
  WHERE i.outlet_id = p_outlet_id
  AND ABS(i.current_stock - COALESCE(m.calculated_stock, 0)) > 0.01
  ORDER BY ABS(i.current_stock - COALESCE(m.calculated_stock, 0)) DESC;
END;
$$;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  RLS UPDATE: Operational Costs — restrict INSERT to owner/manager/acct  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

DROP POLICY IF EXISTS "operational_costs_insert" ON operational_costs;

CREATE POLICY "operational_costs_insert" ON operational_costs
  FOR INSERT WITH CHECK (
    outlet_id = get_user_outlet_id() AND
    user_has_any_role(ARRAY['owner', 'manager', 'accounting'])
  );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  UNIQUE CONSTRAINT on inventory_movements.reference                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_movements_unique_ref
  ON inventory_movements (COALESCE(reference_id, '00000000-0000-0000-0000-000000000000'), COALESCE(reference_type, ''), movement_type)
  WHERE reference_id IS NOT NULL;