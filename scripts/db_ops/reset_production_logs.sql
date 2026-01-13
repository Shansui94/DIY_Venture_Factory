
-- ⚠️ WARNING: This will clear the test data in production_logs
-- We do this to remove the conflicting Foreign Key constraint causing the error.

DROP TABLE IF EXISTS public.production_logs CASCADE;

-- Recreate cleanly
CREATE TABLE public.production_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id TEXT NOT NULL, -- Text type to support "M1", "Line-2" etc.
    alarm_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Re-enable permissions
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

-- Allow Dashboard to read
CREATE POLICY "Enable read access for all users" ON public.production_logs FOR SELECT USING (true);

-- Allow Backend to write (Insert)
CREATE POLICY "Enable insert for authenticated users" ON public.production_logs FOR INSERT WITH CHECK (true);
