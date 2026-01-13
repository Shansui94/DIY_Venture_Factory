
-- SECURE V2 TABLES (RLS ENABLEMENT)
-- This script locks the doors. Only logged-in users (Authenticated) can pass.

-- 1. Helper Macro (Logic)
-- We will apply this policy to all V2 tables:
-- "Enable RLS, then allow SELECT/INSERT/UPDATE/DELETE for role 'authenticated'"

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'master_items_v2', 
        'bom_headers_v2', 
        'bom_items_v2', 
        'stock_ledger_v2', 
        'production_logs_v2',
        'sys_users_v2',
        'crm_partners_v2',
        'crm_price_lists_v2'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- A. Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
        
        -- B. Create Policy (Drop old first to avoid errors)
        EXECUTE format('DROP POLICY IF EXISTS "Auth Only Access" ON %I;', t);
        
        -- C. Allow Authenticated Users (Full Access for MVP, can refine later)
        EXECUTE format('
            CREATE POLICY "Auth Only Access" ON %I 
            FOR ALL 
            TO authenticated 
            USING (true) 
            WITH CHECK (true);
        ', t);
        
        -- D. Grant Permissions (Necessary for standard roles)
        EXECUTE format('GRANT ALL ON %I TO authenticated;', t);
        EXECUTE format('GRANT ALL ON %I TO service_role;', t);
        
        RAISE NOTICE 'Secured table: %', t;
    END LOOP;
END $$;
