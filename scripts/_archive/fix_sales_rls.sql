-- FIX SALES ORDERS RLS POLICY
-- Issue: Users cannot create orders if driver_id is null or policy is too strict.
-- Fix: Allow all authenticated users to full access sales_orders.

-- 1. Enable RLS (Ensure it is on)
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential restrictive policies
DROP POLICY IF EXISTS "Enable Access for Authenticated Users" ON sales_orders;
DROP POLICY IF EXISTS "Auth Only Access" ON sales_orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON sales_orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON sales_orders;

-- 3. Create Permissive Policy for App Users
CREATE POLICY "Enable All Access for Authenticated Users" ON sales_orders
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Grant Permissions
GRANT ALL ON TABLE sales_orders TO authenticated;
GRANT ALL ON TABLE sales_orders TO service_role;
