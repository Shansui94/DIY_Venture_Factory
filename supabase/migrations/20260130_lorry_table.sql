
-- Create lorries table
CREATE TABLE IF NOT EXISTS public.lorries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plate_number TEXT UNIQUE NOT NULL,
    driver_id UUID REFERENCES auth.users(id),
    driver_name TEXT, -- Fallback name
    preferred_zone TEXT,
    status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'On-Route', 'Maintenance', 'Unavailable')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.lorries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view lorries" ON public.lorries
FOR SELECT USING (true);

CREATE POLICY "Admins can manage lorries" ON public.lorries
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users_public 
        WHERE id = auth.uid() AND role IN ('Admin', 'SuperAdmin', 'Manager')
    )
);

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lorries_updated_at BEFORE UPDATE ON public.lorries
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
