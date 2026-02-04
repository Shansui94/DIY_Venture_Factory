
-- 1. Create driver_leave table
CREATE TABLE IF NOT EXISTS public.driver_leave (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES auth.users(id) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    count_days INTEGER NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create lorry_service_requests table
CREATE TABLE IF NOT EXISTS public.lorry_service_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES auth.users(id) NOT NULL,
    plate_number TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Scheduled', 'Completed')),
    scheduled_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.driver_leave ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lorry_service_requests ENABLE ROW LEVEL SECURITY;

-- 4. Policies for driver_leave
CREATE POLICY "Drivers can view their own leave" ON public.driver_leave
FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can insert their own leave" ON public.driver_leave
FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admins can view and update all leave" ON public.driver_leave
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users_public 
        WHERE id = auth.uid() AND role IN ('Admin', 'SuperAdmin', 'Manager')
    )
);

-- 5. Policies for lorry_service_requests
CREATE POLICY "Drivers can view their own service requests" ON public.lorry_service_requests
FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can insert their own service requests" ON public.lorry_service_requests
FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admins can view and update all service requests" ON public.lorry_service_requests
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users_public 
        WHERE id = auth.uid() AND role IN ('Admin', 'SuperAdmin', 'Manager')
    )
);

-- 6. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_leave_dates ON public.driver_leave (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_lorry_service_status ON public.lorry_service_requests (status);
