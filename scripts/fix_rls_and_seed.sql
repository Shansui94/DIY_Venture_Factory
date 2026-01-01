-- FIX RLS & SEED RECIPES (Run in Supabase SQL Editor)

-- 1. Permissive Policies for V2 Tables (Allow Service Role & Admin to seed)
-- In fact, for initial setup, we might want to allow authenticated users to read everything.

ALTER TABLE public.master_items_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.master_items_v2 FOR SELECT USING (true);
CREATE POLICY "Enable all access for service role" ON public.master_items_v2 FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.sys_machines_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.sys_machines_v2 FOR SELECT USING (true);

ALTER TABLE public.bom_headers_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.bom_headers_v2 FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.bom_headers_v2 FOR INSERT WITH CHECK (true); -- Temporary broad access for seeding

ALTER TABLE public.bom_items_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.bom_items_v2 FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.bom_items_v2 FOR INSERT WITH CHECK (true);

-- 2. Retry Seeding Recipes (Manually via SQL to bypass client limits if preferred)
-- Clean bad data first
DELETE FROM bom_items_v2;
DELETE FROM bom_headers_v2;

-- ... Or just re-run the node script after running policy updates above.

-- But here is a direct SQL insert for certainty:

DO $$
DECLARE
    r_id UUID;
BEGIN
    -- [SF-2.2KG-BLACK]
    INSERT INTO bom_headers_v2 (sku, name, machine_type, is_default)
    VALUES ('SF-2.2KG-BLACK', 'Standard Recipe', 'Cast-Line', true) RETURNING recipe_id INTO r_id;

    INSERT INTO bom_items_v2 (recipe_id, material_sku, qty_calculated, notes) VALUES
    (r_id, 'RM-LL-GA1820', 1.88, '94% Body'),
    (r_id, 'RM-MB-BLK', 0.06, '3% MB'),
    (r_id, 'RM-ADD-VIS', 0.06, '3% Vis'),
    (r_id, 'RM-CORE-0.2', 1.00, 'Core');

    -- [SF-2.2KG-CLEAR]
    INSERT INTO bom_headers_v2 (sku, name, machine_type, is_default)
    VALUES ('SF-2.2KG-CLEAR', 'Standard Recipe', 'Cast-Line', true) RETURNING recipe_id INTO r_id;

    INSERT INTO bom_items_v2 (recipe_id, material_sku, qty_calculated, notes) VALUES
    (r_id, 'RM-LL-GA1820', 1.90, '95% Body'),
    (r_id, 'RM-ADD-VIS', 0.10, '5% Vis'),
    (r_id, 'RM-CORE-0.2', 1.00, 'Core');

    -- [BW-SINGLE-BLK]
    INSERT INTO bom_headers_v2 (sku, name, machine_type, is_default)
    VALUES ('BW-SINGLE-BLK', 'Blown Film Recipe', 'Blown-Line', true) RETURNING recipe_id INTO r_id;

    INSERT INTO bom_items_v2 (recipe_id, material_sku, qty_calculated, notes) VALUES
    (r_id, 'RM-LL-ZBB', 1.16, 'Mix'),
    (r_id, 'RM-HD-7260', 0.97, 'Mix'),
    (r_id, 'RM-LD-N125Y', 0.77, 'Mix'),
    (r_id, 'RM-LL-7059', 0.77, 'Mix'),
    (r_id, 'RM-LL-GA1820', 0.58, 'Mix'),
    (r_id, 'RM-MB-BLK', 0.12, 'Color'),
    (r_id, 'RM-RC-BLK', 0.08, 'Recycle');

    -- [BABYROLL-CLR]
    INSERT INTO bom_headers_v2 (sku, name, machine_type, is_default)
    VALUES ('BABYROLL-CLR', 'Baby Roll Recipe', 'Rewinder', true) RETURNING recipe_id INTO r_id;
    
    INSERT INTO bom_items_v2 (recipe_id, material_sku, qty_calculated, notes) VALUES
    (r_id, 'RM-LL-GA1820', 0.24, '95% Body'),
    (r_id, 'RM-ADD-VIS', 0.01, '5% Vis'),
    (r_id, 'RM-CORE-0.05', 1.00, 'Core');

    -- Add others as needed...
END $$;
