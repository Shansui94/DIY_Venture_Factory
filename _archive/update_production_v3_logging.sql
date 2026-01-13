
-- 1. Ensure production_logs_v2 has the 'note' column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='production_logs_v2' AND column_name='note') THEN 
        ALTER TABLE public.production_logs_v2 ADD COLUMN note TEXT; 
    END IF; 
END $$;

-- 2. Define the Function with Correct Column Names AND V1 Sync
CREATE OR REPLACE FUNCTION public.execute_production_run_v3(
  p_sku TEXT,
  p_qty NUMERIC,
  p_operator_id UUID,
  p_machine_id UUID DEFAULT NULL,
  p_job_id TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
  v_product_id UUID;
  v_recipe_record RECORD;
  v_item RECORD;
  v_recipe_name TEXT := 'Standard Auto-Gen';
  v_has_recipe BOOLEAN := false;
  v_log_id UUID;
BEGIN
  -- Validate Input
  IF p_qty <= 0 THEN RETURN json_build_object('success', false, 'message', 'Quantity must be positive'); END IF;

  -- Resolve Product ID (Legacy V1 Support)
  SELECT id INTO v_product_id FROM public.items WHERE sku = p_sku LIMIT 1;

  -- Find Recipe (BOM) - V2
  SELECT * INTO v_recipe_record FROM public.bom_headers_v2 
  WHERE sku = p_sku 
  ORDER BY is_default DESC 
  LIMIT 1;

  IF FOUND THEN
      v_recipe_name := v_recipe_record.name;
      v_has_recipe := true;
  ELSE
      v_recipe_name := 'No Recipe Found';
  END IF;

  -- Execute Deductions (If Recipe Exists)
  IF v_has_recipe THEN
      FOR v_item IN SELECT * FROM public.bom_items_v2 WHERE recipe_id = v_recipe_record.recipe_id LOOP
          -- 1. Updates V2 Ledger
          INSERT INTO public.stock_ledger_v2 (sku, change_qty, event_type, ref_doc, notes)
          VALUES (
              v_item.material_sku, 
              -(COALESCE(v_item.qty_calculated, 0) * p_qty), 
              'production_used', 
              p_job_id, 
              'Used for ' || p_sku
          );

          -- 2. Update V1 Items Stock (Legacy Sync for Raw Materials)
          UPDATE public.items 
          SET current_stock = current_stock - (COALESCE(v_item.qty_calculated, 0) * p_qty)
          WHERE sku = v_item.material_sku;
      END LOOP;
  END IF;

  -- Add Finished Goods to Inventory (V2 Ledger)
  INSERT INTO public.stock_ledger_v2 (sku, change_qty, event_type, ref_doc, notes)
  VALUES (p_sku, p_qty, 'production_output', p_job_id, 'Produced on ' || COALESCE(p_machine_id::text, 'Unknown'));

  -- LOGGING (V2 Logs)
  INSERT INTO public.production_logs_v2 (
      operator_id,
      machine_id, 
      job_id,
      sku,
      output_qty,
      note,
      created_at
  ) VALUES (
      p_operator_id,
      p_machine_id, 
      p_job_id,
      p_sku,
      p_qty,
      COALESCE(p_note, 'Manual Entry'),
      now()
  ) RETURNING log_id INTO v_log_id;

  -- Update Machine Live Output (Legacy V1 Dashboard)
  IF p_machine_id IS NOT NULL AND v_product_id IS NOT NULL THEN
      INSERT INTO public.machine_live_output (machine_id, item_id, today_produced)
      VALUES (p_machine_id, v_product_id, p_qty)
      ON CONFLICT (machine_id, item_id) 
      DO UPDATE SET today_produced = machine_live_output.today_produced + p_qty, last_produced_at = now();
  END IF;

  -- Update V1 Items Stock (Legacy Sync for Finished Goods) -- CRITICAL FIX for LiveStock.tsx
  UPDATE public.items 
  SET current_stock = current_stock + p_qty
  WHERE sku = p_sku;

  RETURN json_build_object(
    'success', true, 
    'message', 'Production Recorded',
    'log_id', v_log_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
