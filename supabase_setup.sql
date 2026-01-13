-- 1. Create users_public table (Missing dependency)
CREATE TABLE IF NOT EXISTS public.users_public (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    name TEXT,
    role TEXT DEFAULT 'User',
    phone TEXT,
    address TEXT,
    photo_url TEXT,
    employee_id TEXT,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for users_public
ALTER TABLE public.users_public ENABLE ROW LEVEL SECURITY;

-- Policies for users_public
CREATE POLICY "Public profiles are viewable by everyone" ON public.users_public FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.users_public FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users_public FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user signup (Auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users_public (id, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', 'User');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Create sales_orders table
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT NOT NULL,
    customer TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'New',
    order_date DATE,
    deadline DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create claims table
CREATE TABLE IF NOT EXISTS public.claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID REFERENCES auth.users(id),
    "userName" TEXT,
    type TEXT,
    amount NUMERIC,
    description TEXT,
    status TEXT DEFAULT 'Pending',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    "receiptUrl" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read sales_orders" ON public.sales_orders FOR SELECT USING (true);
CREATE POLICY "Allow auth insert sales_orders" ON public.sales_orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow auth update sales_orders" ON public.sales_orders FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow individual claims access" ON public.claims FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "Allow admin claims access" ON public.claims FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users_public WHERE id = auth.uid() AND role = 'Admin')
);


-- 4. STORAGE SETUP
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Avatar Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Avatar Auth Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Avatar Owner Update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() = owner);

CREATE POLICY "Receipts Owner Read" ON storage.objects FOR SELECT USING (bucket_id = 'receipts' AND auth.uid() = owner);
CREATE POLICY "Receipts Auth Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');


-- 5. BACKFILL EXISTING USERS (FIX FOR EMPTY PROFILES)
-- This copies existing users from auth.users to public.users_public
INSERT INTO public.users_public (id, email, name, role, created_at, updated_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)), -- Use email prefix if name is missing
    COALESCE(raw_user_meta_data->>'role', 'User'),
    created_at, 
    updated_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- 6. ITEMS TABLE POLICIES (Required for "Add Product")
-- Ensure RLS is on
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view items (or restrict to auth)
CREATE POLICY "Enable read access for all users" ON public.items FOR SELECT USING (true);

-- Allow authenticated users to insert items
CREATE POLICY "Enable insert for authenticated users" ON public.items FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update items (e.g. stock)
CREATE POLICY "Enable update for authenticated users" ON public.items FOR UPDATE USING (auth.role() = 'authenticated');



-- 7. Create maintenance_logs table (For Voice Command)
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id TEXT NOT NULL,
    issue_description TEXT NOT NULL,
    reported_by TEXT, -- Could link to users table
    status TEXT DEFAULT 'Open',
    priority TEXT DEFAULT 'Normal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON public.maintenance_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.maintenance_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.maintenance_logs FOR UPDATE USING (auth.role() = 'authenticated');


-- 8. Create production_logs table (For Factory OS)
CREATE TABLE IF NOT EXISTS public.production_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id TEXT NOT NULL,
    alarm_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- Allow public/anon read for the dashboard
CREATE POLICY "Enable read access for all users" ON public.production_logs FOR SELECT USING (true);
-- Allow service_role (backend) or authenticated users to insert
CREATE POLICY "Enable insert for authenticated users" ON public.production_logs FOR INSERT WITH CHECK (true);

