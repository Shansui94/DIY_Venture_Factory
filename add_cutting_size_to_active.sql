-- Add cutting_size column to machine_active_products if it doesn't exist
ALTER TABLE public.machine_active_products 
ADD COLUMN IF NOT EXISTS cutting_size INTEGER DEFAULT 100;

-- Optional: Update existing records to default 100
UPDATE public.machine_active_products SET cutting_size = 100 WHERE cutting_size IS NULL;
