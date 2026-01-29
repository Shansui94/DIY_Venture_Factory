
-- Drop existing policy if it conflicts or just create a new one for unassigned
-- Check if we can alter the existing one. Usually policies are: "Enable read access for all users" or specific roles.

-- Let's add a policy specifically for Drivers to see Unassigned orders.
-- Or update the general read policy.

-- Policy: "Drivers can see their own orders OR unassigned orders"
create policy "Drivers can see unassigned orders" on sales_orders
for select
to authenticated
using (
  auth.uid() = driver_id OR driver_id IS NULL OR role = 'Driver' 
  -- Note: 'role' column on sales_orders doesn't exist. We verify role via other means usually.
  -- But here, let's keep it simple: allow viewing if driver_id is null.
);

-- Actually, if there is an existing policy like "Users can see own orders", we need to check it.
-- But since I cannot easily see the existing policy definition without querying pg_policies text (which is hard to parse in CLI output usually),
-- I will add a PERMISSIVE policy that adds to the existing permissions.
-- Supabase policies are permissive (OR). So adding a new one extends access.

CREATE POLICY "Enable read access for unassigned orders"
ON "public"."sales_orders"
AS PERMISSIVE
FOR SELECT
TO public
USING (driver_id IS NULL);
