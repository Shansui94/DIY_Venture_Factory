
-- 1. Create table to track what each machine is currently producing
CREATE TABLE IF NOT EXISTS public.machine_active_products (
    machine_id TEXT PRIMARY KEY,
    product_sku TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add product_sku to logs so we know what was produced at that moment
ALTER TABLE public.production_logs 
ADD COLUMN IF NOT EXISTS product_sku TEXT;

-- 3. RLS Policies
ALTER TABLE public.machine_active_products ENABLE ROW LEVEL SECURITY;

-- Allow public read (Dashboard needs to know what's running)
CREATE POLICY "Allow public read" ON public.machine_active_products FOR SELECT USING (true);

-- Allow authenticated insert/update (Backend & Operator App)
CREATE POLICY "Allow authenticated insert/update" ON public.machine_active_products FOR ALL USING (true) WITH CHECK (true);
