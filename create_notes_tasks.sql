
-- 1. Create NOTES table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    tags TEXT[],
    created_by UUID REFERENCES public.users_public(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for notes (Basic policy: users can see public notes or their own notes)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.notes
FOR SELECT USING (true); -- Simplify for now: everyone can read notes

CREATE POLICY "Enable insert for authenticated users only" ON public.notes
FOR INSERT WITH CHECK (auth.uid() = created_by); -- Assuming 'created_by' matches auth.uid (or handled by trigger/app logic)
-- Actually, simple open policy for MVP:
-- CREATE POLICY "Open Access" ON public.notes USING (true) WITH CHECK (true);


-- 2. Create TASKS table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.users_public(id),
    created_by UUID REFERENCES public.users_public(id),
    status TEXT DEFAULT 'To Do',
    priority TEXT DEFAULT 'Normal',
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.tasks
FOR SELECT USING (true); 

CREATE POLICY "Enable write access for all users" ON public.tasks
FOR ALL USING (true);

-- Enable Realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
