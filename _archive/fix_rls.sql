
-- Enable RLS (idempotent if already on)
ALTER TABLE production_logs_v2 ENABLE ROW LEVEL SECURITY;

-- 1. Grant usage (just in case)
GRANT ALL ON production_logs_v2 TO authenticated;

-- 2. Drop existing policies to avoid conflicts (if any exist/fail is fine)
DROP POLICY IF EXISTS "Operators can view own logs" ON production_logs_v2;
DROP POLICY IF EXISTS "Operators can insert logs" ON production_logs_v2;
DROP POLICY IF EXISTS "Enable read access for all users" ON production_logs_v2;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON production_logs_v2;

-- 3. Create Policy for SELECT (Fixes the Download Report issue)
-- Allow users to see logs where the operator_id matches their sys_users_v2 profile
CREATE POLICY "Operators can view own logs"
ON production_logs_v2
FOR SELECT
TO authenticated
USING (
    operator_id IN (
        SELECT id FROM sys_users_v2 WHERE auth_user_id = auth.uid()
    )
);

-- 4. Create Policy for INSERT (Ensures Production Runs work if RLS is enforced)
CREATE POLICY "Operators can insert logs"
ON production_logs_v2
FOR INSERT
TO authenticated
WITH CHECK (
    operator_id IN (
        SELECT id FROM sys_users_v2 WHERE auth_user_id = auth.uid()
    )
);

-- 5. Helper verification (optional)
-- SELECT * FROM production_logs_v2 LIMIT 5;
