-- Allow all authenticated users (Drivers, Admins, Dispatchers) to VIEW all leave records
-- This is required for the Dispatcher to check for conflicts when assigning jobs.

DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."driver_leave";
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."driver_leave";

CREATE POLICY "Enable read access for all users"
ON "public"."driver_leave"
FOR SELECT
TO authenticated
USING (true);

-- Ensure RLS is on
ALTER TABLE "public"."driver_leave" ENABLE ROW LEVEL SECURITY;
