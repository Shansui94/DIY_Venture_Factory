-- FIX CUSTOMER TABLE RLS POLICY
-- Issue: Customers imported but not visible due to Row Level Security.
-- Fix: Grant full access to authenticated users for sys_customers.

-- 1. Enable RLS (Best Practice)
ALTER TABLE sys_customers ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential restrictive policies
DROP POLICY IF EXISTS "Start fresh" ON sys_customers;
DROP POLICY IF EXISTS "Enable read access for all users" ON sys_customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON sys_customers;
DROP POLICY IF EXISTS "Enable update for users based on email" ON sys_customers;

-- 3. Create Permissive Policy (AI Auto-Enrichment needs Insert/Select)
CREATE POLICY "Enable All Access for Authenticated Users" ON sys_customers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Grant Permissions
GRANT ALL ON TABLE sys_customers TO authenticated;
GRANT ALL ON TABLE sys_customers TO service_role;
