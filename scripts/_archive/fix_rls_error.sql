
-- 1. Grant Table Permissions to 'authenticated' role (Device User)
GRANT ALL ON TABLE production_logs_v2 TO authenticated;
GRANT ALL ON TABLE stock_ledger_v2 TO authenticated;
GRANT ALL ON TABLE bom_headers_v2 TO authenticated;
GRANT ALL ON TABLE bom_items_v2 TO authenticated;
GRANT ALL ON TABLE master_items_v2 TO authenticated;

-- 2. Reset RLS Policies for Production Logs to be Permissive
ALTER TABLE production_logs_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable Access for Authenticated" ON production_logs_v2;
DROP POLICY IF EXISTS "Auth Only Access" ON production_logs_v2;

CREATE POLICY "Enable Access for Authenticated" ON production_logs_v2
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

-- 3. Reset RLS Policies for Stock Ledger
ALTER TABLE stock_ledger_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable Access for Authenticated" ON stock_ledger_v2;

CREATE POLICY "Enable Access for Authenticated" ON stock_ledger_v2
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

-- 4. Ensure RPC runs with elevated privileges (SECURITY DEFINER)
-- This is the nuclear option ensuring it bypasses strict table policies if needed
ALTER FUNCTION execute_production_run_v3(TEXT, DECIMAL, UUID, TEXT, DECIMAL, TEXT, TEXT) SECURITY DEFINER;
