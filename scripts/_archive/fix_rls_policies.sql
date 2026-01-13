-- FIX RLS POLICIES FOR DATA MANAGEMENT

-- 1. SYS_VEHICLES
ALTER TABLE sys_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON sys_vehicles;
DROP POLICY IF EXISTS "Enable all access for users" ON sys_vehicles;
DROP POLICY IF EXISTS "Public read vehicles" ON sys_vehicles;
DROP POLICY IF EXISTS "Admin manage vehicles" ON sys_vehicles;
DROP POLICY IF EXISTS "Enable read access for all users" ON sys_vehicles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON sys_vehicles;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON sys_vehicles;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON sys_vehicles;

CREATE POLICY "Enable all access for users" 
ON sys_vehicles 
FOR ALL 
TO authenticated, anon
USING (true) 
WITH CHECK (true);


-- 2. SYS_CUSTOMERS
ALTER TABLE sys_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON sys_customers;
DROP POLICY IF EXISTS "Enable all access for users" ON sys_customers;
DROP POLICY IF EXISTS "Public read customers" ON sys_customers;
DROP POLICY IF EXISTS "Admin manage customers" ON sys_customers;
DROP POLICY IF EXISTS "Enable read access for all users" ON sys_customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON sys_customers;

CREATE POLICY "Enable all access for users" 
ON sys_customers 
FOR ALL 
TO authenticated, anon
USING (true) 
WITH CHECK (true);


-- 3. MASTER_ITEMS_V2 (Safe check)
ALTER TABLE master_items_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON master_items_v2;
DROP POLICY IF EXISTS "Allow full access to users" ON master_items_v2;

CREATE POLICY "Allow full access to users" 
ON master_items_v2 
FOR ALL 
TO authenticated, anon
USING (true) 
WITH CHECK (true);
