-- ULTIMATE FIX: Synchronize Table Column and Function Logic

-- 1. Ensure Table has CORRECT column (event_type)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_ledger_v2') THEN
        -- If 'change_type' exists, rename it to 'event_type'
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'stock_ledger_v2' AND column_name = 'change_type') THEN
            ALTER TABLE "public"."stock_ledger_v2" RENAME COLUMN "change_type" TO "event_type";
        END IF;

        -- If 'event_type' missing (and no change_type), add it
         IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'stock_ledger_v2' AND column_name = 'event_type') THEN
            ALTER TABLE "public"."stock_ledger_v2" ADD COLUMN "event_type" TEXT;
        END IF;
    END IF;
END $$;


-- 2. Drop Function explicitly to clear cache/conflicts
DROP FUNCTION IF EXISTS public.record_driver_stock_movement(TEXT, NUMERIC, TEXT, TEXT, TEXT);

-- 3. Re-Create Function using 'event_type'
CREATE OR REPLACE FUNCTION public.record_driver_stock_movement(
  p_sku TEXT,
  p_qty NUMERIC,
  p_event_type TEXT,
  p_ref_doc TEXT,
  p_notes TEXT
)
RETURNS JSONB AS $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_ledger_v2') THEN
      INSERT INTO public.stock_ledger_v2 (
        sku,
        change_qty,
        event_type, -- Guaranteed to exist now
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
       -- Fallback
       INSERT INTO public.stock_ledger (sku, qty_change, event, ref_id, notes) 
       VALUES (p_sku, p_qty, p_event_type, p_ref_doc, p_notes);
  END IF;
  
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant Permissions
GRANT EXECUTE ON FUNCTION public.record_driver_stock_movement TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_driver_stock_movement TO anon;
GRANT EXECUTE ON FUNCTION public.record_driver_stock_movement TO service_role;
