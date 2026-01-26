-- Enable RLS (Good practice, though likely already enabled)
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

-- Remove potential restrictive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON production_logs;
DROP POLICY IF EXISTS "Enable all access for users" ON production_logs;
DROP POLICY IF EXISTS "Allow full access to users" ON production_logs;

-- Create a permissive policy for reading
CREATE POLICY "Enable read access for all users"
ON production_logs
FOR SELECT
TO authenticated, anon
USING (true);

-- Optional: Allow inserts if needed by frontend (though usually backend does it)
-- CREATE POLICY "Enable insert for all users" ON production_logs FOR INSERT TO authenticated, anon WITH CHECK (true);
