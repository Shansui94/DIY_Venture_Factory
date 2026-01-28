-- Function to safely record stock movements (bypassing RLS)
CREATE OR REPLACE FUNCTION public.record_stock_movement(
  p_sku TEXT,
  p_qty NUMERIC,
  p_event_type TEXT,
  p_ref_doc TEXT,
  p_notes TEXT
)
RETURNS JSONB AS $$
BEGIN
  INSERT INTO public.stock_ledger_v2 (
    sku,
    change_qty,
    event_type,
    ref_doc,
    notes,
    timestamp
  ) VALUES (
    p_sku,
    p_qty,
    p_event_type,
    p_ref_doc,
    p_notes,
    NOW()
  );
  
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
