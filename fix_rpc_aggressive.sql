-- AGGRESSIVE FIX: CLEANUP ALL OLD VERSIONS FIRST

-- 1. Drop potentially ambiguous functions
-- We drop with CASCADE to ensure triggers/dependencies are gone
DROP FUNCTION IF EXISTS public.record_stock_movement(TEXT, NUMERIC, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.record_stock_movement(TEXT, DECIMAL, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.record_stock_movement(VARCHAR, NUMERIC, VARCHAR, VARCHAR, VARCHAR) CASCADE;

-- 2. Define the CORRECT function (using event_type)
CREATE OR REPLACE FUNCTION public.record_stock_movement(
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
        event_type, -- <--- THIS IS THE FIX (was change_type)
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
      -- Fallback to V1 (Unlikely but safe)
       INSERT INTO public.stock_ledger (sku, qty_change, event, ref_id, notes) 
       VALUES (p_sku, p_qty, p_event_type, p_ref_doc, p_notes);
  END IF;
  
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Re-Verify Driver Permissions (Just to be safe)
-- Grant Drivers UPDATE on Orders (Already done, but ensuring it sticks)
DROP POLICY IF EXISTS "Enable update for assigned drivers" ON "public"."sales_orders";
CREATE POLICY "Enable update for assigned drivers"
ON "public"."sales_orders"
FOR UPDATE
TO public
USING (auth.uid() = driver_id);

-- 4. Grant Drivers INSERT on Stock Ledger
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_ledger_v2') THEN
        ALTER TABLE "public"."stock_ledger_v2" ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."stock_ledger_v2";
        CREATE POLICY "Enable insert for authenticated users"
        ON "public"."stock_ledger_v2"
        FOR INSERT
        TO public
        WITH CHECK (true);
    END IF;
END
$$;
