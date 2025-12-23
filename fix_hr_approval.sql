-- FIX: Allow Admin and HR users to update other users' profiles (e.g. for Approval)

-- 1. Policy for UPDATE
-- Checks if the CURRENT user has 'Admin' or 'HR' role in their public profile
CREATE POLICY "Admins and HR can update all profiles" ON public.users_public
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.users_public
        WHERE id = auth.uid() AND role IN ('Admin', 'HR')
    )
);

-- 2. Policy for DELETE (Optional, but good for management)
CREATE POLICY "Admins and HR can delete users" ON public.users_public
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.users_public
        WHERE id = auth.uid() AND role IN ('Admin', 'HR')
    )
);

-- 3. Verify SELECT is open (Already set to true in setup, but good to ensure)
-- CREATE POLICY "Public profiles are viewable by everyone" ON public.users_public FOR SELECT USING (true);
