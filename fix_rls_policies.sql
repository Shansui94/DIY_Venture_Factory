-- FIX: Enable Product Creation (RLS Policy)
-- This fixes the "NEW ROW VIOLATES ROW LEVEL SECURITY policy for table item" error.

-- 1. Enable Insert for Items (Allows Auto-Seeding new products)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."items";
CREATE POLICY "Enable insert for authenticated users only" 
ON "public"."items" 
AS PERMISSIVE 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 2. Ensure Select is also open (likely already exists, but executing to be safe)
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."items";
CREATE POLICY "Enable read access for all users" 
ON "public"."items" 
AS PERMISSIVE 
FOR SELECT 
TO public 
USING (true);

-- 3. Grant usage on sequences (Fix for ID auto-generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
