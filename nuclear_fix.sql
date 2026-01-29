-- NUCLEAR OPTION: Create a BRAND NEW function with a unique name
-- This avoids any conflict with the existing broken 'record_stock_movement' function

CREATE OR REPLACE FUNCTION public.record_driver_stock_movement(
  p_sku TEXT,
  p_qty NUMERIC,
  p_event_type TEXT,
  p_ref_doc TEXT,
  p_notes TEXT
)
RETURNS JSONB AS $$
BEGIN
  -- Insert into V2 Table
  -- Check if table exists just in case
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_ledger_v2') THEN
      INSERT INTO public.stock_ledger_v2 (
        sku,
        change_qty,
        event_type, -- Correct field name
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
  ELSE
      -- Fallback to V1 if V2 doesn't exist (Safety net)
       INSERT INTO public.stock_ledger (sku, qty_change, event, ref_id, notes) 
       VALUES (p_sku, p_qty, p_event_type, p_ref_doc, p_notes);
  END IF;
  
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to this new function
GRANT EXECUTE ON FUNCTION public.record_driver_stock_movement TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_driver_stock_movement TO anon;
GRANT EXECUTE ON FUNCTION public.record_driver_stock_movement TO service_role;
