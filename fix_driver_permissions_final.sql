-- 1. Redefine the RPC function to use the correct 'event_type' column
CREATE OR REPLACE FUNCTION public.record_stock_movement(
  p_sku TEXT,
  p_qty NUMERIC,
  p_event_type TEXT,
  p_ref_doc TEXT,
  p_notes TEXT
)
RETURNS JSONB AS $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_ledger_v2') THEN
      INSERT INTO public.stock_ledger_v2 (
        sku,
        change_qty,
        event_type, -- Corrected from change_type
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
      -- Fallback if user is using v1 schema or a different table
       INSERT INTO public.stock_ledger (
        sku,
        qty_change, -- Usually v1 has different names, but assuming generic structure or ignoring if V2 only
        event,
        ref_id,
        notes
      ) VALUES (
        p_sku,
        p_qty,
        p_event_type,
        p_ref_doc,
        p_notes
      );
  END IF;
  
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  -- Don't crash the transaction, but return error
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix Sales Orders RLS (Critical for Status Update)
DROP POLICY IF EXISTS "Enable update for assigned drivers" ON "public"."sales_orders";
CREATE POLICY "Enable update for assigned drivers"
ON "public"."sales_orders"
FOR UPDATE
TO public
USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Enable read for assigned drivers" ON "public"."sales_orders";
CREATE POLICY "Enable read for assigned drivers"
ON "public"."sales_orders"
FOR SELECT
TO public
USING (auth.uid() = driver_id OR driver_id IS NULL);

-- 3. Fix Stock Ledger RLS
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
