-- DEBUG SCRIPT: Diagnosis
-- 1. Check if view exists and returns data
SELECT count(*) FROM v2_inventory_view;

-- 2. Check RLS on master tables
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('master_items_v2', 'sys_machines_v2', 'production_logs_v2');

-- 3. EMERGENCY FIX: Grant access to authenticated users (just in case)
-- (Run this if step 2 shows rowsecurity = true)
ALTER TABLE master_items_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access for authenticated users" ON master_items_v2 FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE sys_machines_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access for authenticated users" ON sys_machines_v2 FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE production_logs_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access for authenticated users" ON production_logs_v2 FOR SELECT USING (auth.role() = 'authenticated');
