-- FORCE FIX RLS POLICIES
-- This script will reset policies for 'production_logs' to ensure data is visible.

-- 1. Disable RLS temporarily to clear state (optional but safer for reset)
ALTER TABLE production_logs DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy if it exists (to avoid errors)
DROP POLICY IF EXISTS "Allow all read" ON production_logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON production_logs;

-- 3. Re-Enable RLS
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create a PERMISSIVE policy that explicitly allows SELECT for EVERYONE
CREATE POLICY "Force Allow Read All"
ON production_logs
FOR SELECT
USING (true); -- true means "always allow"

-- 5. Grant permissions to roles just in case
GRANT SELECT ON production_logs TO anon;
GRANT SELECT ON production_logs TO authenticated;
GRANT SELECT ON production_logs TO service_role;

-- Verification:
SELECT count(*) FROM production_logs;
