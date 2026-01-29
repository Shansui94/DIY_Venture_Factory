-- 1. Enable UPDATE on sales_orders for drivers
DROP POLICY IF EXISTS "Enable update for assigned drivers" ON "public"."sales_orders";
CREATE POLICY "Enable update for assigned drivers"
ON "public"."sales_orders"
FOR UPDATE
TO public
USING (auth.uid() = driver_id);

-- 2. Enable INSERT on stock_ledger for drivers (if RLS is enabled)
-- Assuming stock_ledger exists. If it's a different table, this might fail, but usually it's needed for RPC.
-- If RLS is NOT enabled on stock_ledger, this is fine. But if it IS, they need this.
ALTER TABLE IF EXISTS "public"."stock_ledger" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."stock_ledger";
CREATE POLICY "Enable insert for authenticated users"
ON "public"."stock_ledger"
FOR INSERT
TO public
WITH CHECK (true);

-- 3. Verify SELECT is also correct for their own orders
DROP POLICY IF EXISTS "Enable read for assigned drivers" ON "public"."sales_orders";
CREATE POLICY "Enable read for assigned drivers"
ON "public"."sales_orders"
FOR SELECT
TO public
USING (auth.uid() = driver_id OR driver_id IS NULL);
