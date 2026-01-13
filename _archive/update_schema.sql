
-- 8. Payroll Table
CREATE TABLE IF NOT EXISTS public.payroll (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month TEXT NOT NULL, -- e.g. "2023-12"
    "userId" UUID REFERENCES auth.users(id),
    "userName" TEXT,
    "baseSalary" NUMERIC DEFAULT 1500, -- Default basic
    "claimsTotal" NUMERIC DEFAULT 0,
    "otTotal" NUMERIC DEFAULT 0,
    "netSalary" NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- Policies for Payroll
DROP POLICY IF EXISTS "Admin full access payroll" ON public.payroll;
CREATE POLICY "Admin full access payroll" ON public.payroll FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users_public WHERE id = auth.uid() AND role = 'Admin')
);

DROP POLICY IF EXISTS "Users read own payroll" ON public.payroll;
CREATE POLICY "Users read own payroll" ON public.payroll FOR SELECT USING (auth.uid() = "userId");

-- 9. Update Claims Table (Driver Fields)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'claims' AND column_name = 'odometerStart') THEN
        ALTER TABLE public.claims ADD COLUMN "odometerStart" NUMERIC;
        ALTER TABLE public.claims ADD COLUMN "odometerEnd" NUMERIC;
        ALTER TABLE public.claims ADD COLUMN "odometerStartImg" TEXT;
        ALTER TABLE public.claims ADD COLUMN "odometerEndImg" TEXT;
        ALTER TABLE public.claims ADD COLUMN distance NUMERIC;
    END IF;
END $$;

-- 10. Update Users Table (Salary Field)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users_public' AND column_name = 'salary') THEN
        ALTER TABLE public.users_public ADD COLUMN salary NUMERIC DEFAULT 1500;
    END IF;
END $$;

-- 11. Multi-Factory Support

-- A. Factories Table
CREATE TABLE IF NOT EXISTS public.factories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    type TEXT DEFAULT 'Production', -- Production / Warehouse
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for factories
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
CREATE POLICY 'Read factories' ON public.factories FOR SELECT USING (true);
CREATE POLICY 'Admin manage factories' ON public.factories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users_public WHERE id = auth.uid() AND role = 'Admin')
);

-- Seed Initial Factories (Idempotent)
INSERT INTO public.factories (name, type)
SELECT 'Factory 1 (Main)', 'Production'
WHERE NOT EXISTS (SELECT 1 FROM public.factories WHERE name = 'Factory 1 (Main)');

INSERT INTO public.factories (name, type)
SELECT 'Factory 2', 'Production'
WHERE NOT EXISTS (SELECT 1 FROM public.factories WHERE name = 'Factory 2');

INSERT INTO public.factories (name, type)
SELECT 'Factory 3', 'Production'
WHERE NOT EXISTS (SELECT 1 FROM public.factories WHERE name = 'Factory 3');

INSERT INTO public.factories (name, type)
SELECT 'Factory 4', 'Production'
WHERE NOT EXISTS (SELECT 1 FROM public.factories WHERE name = 'Factory 4');


-- B. Machines Table
CREATE TABLE IF NOT EXISTS public.machines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- e.g. M-01
    factory_id UUID REFERENCES public.factories(id),
    type TEXT DEFAULT 'Extruder',
    status TEXT DEFAULT 'Idle', -- Running, Idle, Offline
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for machines
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY 'Read machines' ON public.machines FOR SELECT USING (true);
CREATE POLICY 'Auth manage machines' ON public.machines FOR ALL USING (auth.role() = 'authenticated');


-- C. Factory Inventory (The Join Table)
CREATE TABLE IF NOT EXISTS public.factory_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
    factory_id UUID REFERENCES public.factories(id) ON DELETE CASCADE,
    quantity NUMERIC DEFAULT 0,
    min_stock NUMERIC DEFAULT 0, -- Reorder level per factory
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, factory_id) -- Prevent duplicates
);

-- Enable RLS for inventory
ALTER TABLE public.factory_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY 'Read factory inventory' ON public.factory_inventory FOR SELECT USING (true);
CREATE POLICY 'Auth update factory inventory' ON public.factory_inventory FOR ALL USING (auth.role() = 'authenticated');

