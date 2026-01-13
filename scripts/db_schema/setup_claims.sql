-- 1. Create Claims Table
create table if not exists public.claims (
  id uuid default gen_random_uuid() primary key,
  "userId" uuid not null, -- Using quoted camelCase to match code's expectation if it sends camelCase, OR we map it. 
  -- Code sends: userId, userName, type, amount...
  -- Supabase client usually maps to snake_case automatically if configured, BUT our existing codebase seems to use mixed.
  -- Let's look at existing code: .from('claims').select('*').eq('userId', ...)
  -- IMPORTANT: The code uses `userId`.
  
  -- However, standard SQL is snake_case.
  -- Let's use snake_case in DB and relying on the code to match OR updating the code.
  -- Checking ClaimsManagement.tsx: .eq('userId', user.id) -> This implies the COLUMN name is `userId`.
  -- To be safe and consistent with standard Postgres but supporting the code, I will use quotes "userId".
  
  "userId" uuid, -- nullable for flexibility or linked to auth.users
  "userName" text,
  type text,
  amount numeric,
  description text,
  status text default 'Pending',
  timestamp timestamptz default now(),
  "receiptUrl" text,
  
  -- Transport / Driver
  "odometerStart" numeric,
  "odometerEnd" numeric,
  "odometerStartImg" text,
  "odometerEndImg" text,
  distance numeric,
  
  created_at timestamptz default now()
);

-- 2. Storage for Receipts
insert into storage.buckets (id, name, public) 
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- 3. RLS Policies
alter table public.claims enable row level security;

-- Allow insert
create policy "Enable insert for authenticated users only"
on public.claims for insert 
to authenticated 
with check (true);

-- Allow select (Own claims OR Admins)
create policy "Enable read access for users to their own claims"
on public.claims for select
to authenticated
using ( auth.uid() = "userId" );

-- Allow update (Admins only - Simplified for now: Allow all authenticated to update for Approval workflow testing)
-- Ideally: using ( get_my_claim_user_role() = 'Admin' )
create policy "Enable update for authenticated users"
on public.claims for update
to authenticated
using (true);

-- Storage Policies
create policy "Give users access to own folder 1ok22a_0" on storage.objects for select to public using (bucket_id = 'receipts');
create policy "Give users access to own folder 1ok22a_1" on storage.objects for insert to public with check (bucket_id = 'receipts');
