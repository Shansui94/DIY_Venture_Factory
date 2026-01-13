-- Secure Function to View Live Stock (Bypasses RLS)
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_live_stock_viewer()
RETURNS TABLE (
  id UUID,
  sku VARCHAR,
  name VARCHAR,
  current_stock NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner permissions (bypasses RLS)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id, 
    i.sku::VARCHAR, 
    i.name::VARCHAR, 
    COALESCE(i.current_stock, 0)::NUMERIC 
  FROM public.items i
  ORDER BY i.sku ASC;
END;
$$;

-- Grant permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_live_stock_viewer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_live_stock_viewer() TO anon;
