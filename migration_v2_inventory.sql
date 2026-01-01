-- ==========================================
-- STEP 1: Create V2 Inventory Verification View
-- Source of Truth: master_items_v2 (Metadata) + stock_ledger_v2 (Quantity)
-- ==========================================

CREATE OR REPLACE VIEW public.v2_inventory_view AS
SELECT 
    m.sku,
    m.name,
    m.type,
    m.uom,
    COALESCE(SUM(l.change_qty), 0) as current_stock,
    MAX(l.timestamp) as last_updated
FROM public.master_items_v2 m
LEFT JOIN public.stock_ledger_v2 l ON m.sku = l.sku
GROUP BY m.sku, m.name, m.type, m.uom;

-- Grant permissions
GRANT SELECT ON public.v2_inventory_view TO authenticated;
GRANT SELECT ON public.v2_inventory_view TO anon;

-- ==========================================
-- STEP 2: Update Live Stock RPC to use V2 View
-- ==========================================

-- Drop old function first to change return signature safely
DROP FUNCTION IF EXISTS public.get_live_stock_viewer();

CREATE OR REPLACE FUNCTION public.get_live_stock_viewer()
RETURNS TABLE (
  sku VARCHAR,
  name VARCHAR,
  current_stock NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.sku::VARCHAR, 
    v.name::VARCHAR, 
    v.current_stock::NUMERIC 
  FROM public.v2_inventory_view v
  ORDER BY v.current_stock DESC, v.sku ASC;
END;
$$;
