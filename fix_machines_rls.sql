-- Enable RLS (idempotent)
ALTER TABLE sys_machines_v2 ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any (to avoid conflict)
DROP POLICY IF EXISTS "Enable read access for all users" ON sys_machines_v2;

-- Create policy to allow SELECT for everyone
CREATE POLICY "Enable read access for all users"
ON sys_machines_v2
FOR SELECT
USING (true);
