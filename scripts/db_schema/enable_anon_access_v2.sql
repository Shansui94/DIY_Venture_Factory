-- EMERGENCY FIX for Device Mode (Anon Access)
-- "Device Stations" might not be fully authenticated in Supabase but need data.
-- Enable READ access for 'anon' role on V2 tables.

BEGIN;

-- 1. Master Items V2
DROP POLICY IF EXISTS "Allow read access for anon" ON master_items_v2;
CREATE POLICY "Allow read access for anon" ON master_items_v2 FOR SELECT TO anon USING (true);

-- 2. Sys Machines V2
DROP POLICY IF EXISTS "Allow read access for anon" ON sys_machines_v2;
CREATE POLICY "Allow read access for anon" ON sys_machines_v2 FOR SELECT TO anon USING (true);

-- 3. Production Logs V2
DROP POLICY IF EXISTS "Allow read access for anon" ON production_logs_v2;
CREATE POLICY "Allow read access for anon" ON production_logs_v2 FOR SELECT TO anon USING (true);

-- 4. Job Orders (Required for ProductionControl)
DROP POLICY IF EXISTS "Allow read access for anon" ON job_orders;
CREATE POLICY "Allow read access for anon" ON job_orders FOR SELECT TO anon USING (true);

-- 5. Machine Active Products (Required for ProductionControl)
DROP POLICY IF EXISTS "Allow read access for anon" ON machine_active_products;
CREATE POLICY "Allow read access for anon" ON machine_active_products FOR SELECT TO anon USING (true);

COMMIT;
