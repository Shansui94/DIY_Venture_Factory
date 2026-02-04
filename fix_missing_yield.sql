-- Add yield column to machine_active_products to support dynamic yield from the UI
ALTER TABLE public.machine_active_products 
ADD COLUMN IF NOT EXISTS yield INTEGER DEFAULT 1;

-- Also ensure cutting_size is present
ALTER TABLE public.machine_active_products 
ADD COLUMN IF NOT EXISTS cutting_size INTEGER DEFAULT 100;

-- Refresh PostgREST schema cache (Supabase specific)
NOTIFY pgrst, 'reload schema';
