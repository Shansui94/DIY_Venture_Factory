-- ==========================================
-- Dynamic Inventory Reservation Logic
-- ==========================================

-- 1. Create a Helper View to calculate Reserved Quantities from Pending DOs
-- This sums up all items in 'New' Sales Orders
CREATE OR REPLACE VIEW public.v2_reserved_stock AS
SELECT
    item ->> 'sku' as sku,
    SUM(COALESCE((item ->> 'quantity')::numeric, 0)) as reserved_qty
FROM
    public.sales_orders,
    jsonb_array_elements(items) as item
WHERE
    status = 'New' -- Only reserve for 'New' (Pending) orders
GROUP BY
    item ->> 'sku';

-- 2. Update the Inventory View to include Reservation
-- This view now provides: Physical (Ledger), Reserved (DOs), and Available (Net)
-- ERROR FIX: Drop existing view first because we are renaming columns (current_stock -> physical_stock)
DROP VIEW IF EXISTS public.v2_inventory_view CASCADE;

CREATE OR REPLACE VIEW public.v2_inventory_view AS
SELECT 
    m.sku,
    m.name,
    m.type,
    m.uom,
    COALESCE(SUM(l.change_qty), 0) as physical_stock,
    COALESCE(r.reserved_qty, 0) as reserved_stock,
    (COALESCE(SUM(l.change_qty), 0) - COALESCE(r.reserved_qty, 0)) as available_stock,
    MAX(l.timestamp) as last_updated
FROM public.master_items_v2 m
LEFT JOIN public.stock_ledger_v2 l ON m.sku = l.sku
LEFT JOIN public.v2_reserved_stock r ON m.sku = r.sku
GROUP BY m.sku, m.name, m.type, m.uom, r.reserved_qty;

-- 3. Update the RPC used by Live Stock Monitor
-- Now returns 'available_stock' as 'current_stock' so the UI reflects what can be sold.
-- ERROR FIX: Drop function to allow return type change
DROP FUNCTION IF EXISTS public.get_live_stock_viewer();

CREATE OR REPLACE FUNCTION public.get_live_stock_viewer()
RETURNS TABLE (
  sku VARCHAR,
  name VARCHAR,
  current_stock NUMERIC,
  reserved_stock NUMERIC -- Added for visibility
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.sku::VARCHAR, 
    v.name::VARCHAR, 
    v.available_stock::NUMERIC as current_stock, -- The net available amount
    v.reserved_stock::NUMERIC
  FROM public.v2_inventory_view v
  ORDER BY v.available_stock DESC, v.sku ASC;
END;
$$;
