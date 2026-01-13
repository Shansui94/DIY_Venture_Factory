
-- 1. Add missing alarm_count column if it doesn't exist
ALTER TABLE public.production_logs 
ADD COLUMN IF NOT EXISTS alarm_count INTEGER DEFAULT 1;

-- 2. Ensure machine_id is TEXT (in case it was created as UUID)
ALTER TABLE public.production_logs 
ALTER COLUMN machine_id TYPE TEXT;

-- 3. Reload schema cache (Supabase specific, sometimes needed)
NOTIFY pgrst, 'reload schema';
