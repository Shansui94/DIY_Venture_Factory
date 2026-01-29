-- 1. Enable UPDATE on sales_orders for drivers
-- This allows them to change status to 'Delivered'
DROP POLICY IF EXISTS "Enable update for assigned drivers" ON "public"."sales_orders";
CREATE POLICY "Enable update for assigned drivers"
ON "public"."sales_orders"
FOR UPDATE
TO public
USING (auth.uid() = driver_id);

-- 2. Enable READ on sales_orders for drivers
-- This allows them to see their own orders AND unassigned/new orders
DROP POLICY IF EXISTS "Enable read for assigned drivers" ON "public"."sales_orders";
CREATE POLICY "Enable read for assigned drivers"
ON "public"."sales_orders"
FOR SELECT
TO public
USING (auth.uid() = driver_id OR driver_id IS NULL);

-- 3. Enable INSERT on stock_ledger_v2 for drivers (if RLS is enabled)
-- Corrected table name from stock_ledger to stock_ledger_v2
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
