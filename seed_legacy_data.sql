
-- 1. Insert Raw Materials (Resins & Additives)
INSERT INTO master_items_v2 (sku, name, type, category, supply_type, uom, status) VALUES
('RM-LL-GA1820', 'LLDPE Petrothene GA1820', 'Raw', 'Resin', 'Purchased', 'KG', 'Active'),
('RM-LL-7059', 'LLDPE 7059 (OQ)', 'Raw', 'Resin', 'Purchased', 'KG', 'Active'),
('RM-LD-N125Y', 'LDPE Etilinas N125Y', 'Raw', 'Resin', 'Purchased', 'KG', 'Active'),
('RM-HD-7260', 'HDPE GC 7260', 'Raw', 'Resin', 'Purchased', 'KG', 'Active'),
('RM-LL-ZBB', 'LLDPE ZBB (Sabic/Generic)', 'Raw', 'Resin', 'Purchased', 'KG', 'Active'),
('RM-RC-BLK', 'Recycle Material Black', 'Raw', 'Scrap', 'Manufactured', 'KG', 'Active'),
('RM-MB-BLK', 'Masterbatch 8092 Black', 'Raw', 'Additive', 'Purchased', 'KG', 'Active'),
('RM-ADD-VIS', 'Vistamaxx Additive', 'Raw', 'Additive', 'Purchased', 'KG', 'Active'),
('RM-CORE-0.2', 'Paper Core 0.2KG (Stretch)', 'Raw', 'Packaging', 'Purchased', 'PCS', 'Active'),
('RM-CORE-0.05', 'Paper Core 0.05KG (Baby)', 'Raw', 'Packaging', 'Purchased', 'PCS', 'Active')
ON CONFLICT (sku) DO NOTHING;

-- 2. Insert Products (Finished Goods)
INSERT INTO master_items_v2 (sku, name, type, category, supply_type, uom, net_weight_kg, status) VALUES
('SF-2.2KG-BLACK', 'Stretch Film Black 2.2kg', 'FG', 'StretchFilm', 'Manufactured', 'Roll', 2.00, 'Active'),
('SF-2.2KG-CLEAR', 'Stretch Film Clear 2.2kg', 'FG', 'StretchFilm', 'Manufactured', 'Roll', 2.00, 'Active'),
('BABYROLL-CLR', 'Baby Roll Stretch Film Clear', 'FG', 'StretchFilm', 'Manufactured', 'Roll', 0.25, 'Active'),
('BW-SINGLE-BLK', 'BW Single Layer Black (1m)', 'FG', 'StretchFilm', 'Manufactured', 'Roll', 4.45, 'Active'),
('BW-DOUBLE-BLK', 'BW Double Layer Black (1m)', 'FG', 'StretchFilm', 'Manufactured', 'Roll', 6.55, 'Active'),
('BW-SINGLE-CLR', 'BW Single Layer Clear (1m)', 'FG', 'StretchFilm', 'Manufactured', 'Roll', 4.45, 'Active'),
('BW-DOUBLE-CLR', 'BW Double Layer Clear (1m)', 'FG', 'StretchFilm', 'Manufactured', 'Roll', 6.55, 'Active'),
('BW20CM-BLK', 'BW Black 20cm Cut', 'FG', 'StretchFilm', 'Manufactured', 'Roll', 0.89, 'Active'),
('BW20CM-CLR', 'BW Clear 20cm Cut', 'FG', 'StretchFilm', 'Manufactured', 'Roll', 0.89, 'Active')
ON CONFLICT (sku) DO NOTHING;

-- 3. Insert Recipes (BOM)
-- Helper function to insert if not exists
DO $$
DECLARE
    rec_id UUID;
    parent_sku TEXT;
BEGIN

    -- A. SF-2.2KG-BLACK
    parent_sku := 'SF-2.2KG-BLACK';
    INSERT INTO bom_headers_v2 (sku, name, machine_type, is_default)
    VALUES (parent_sku, 'Standard Recipe', 'Cast-Line', true)
    RETURNING recipe_id INTO rec_id;

    INSERT INTO bom_items_v2 (recipe_id, material_sku, qty_calculated, notes) VALUES
    (rec_id, 'RM-LL-GA1820', 1.88, '94% Body'),
    (rec_id, 'RM-MB-BLK', 0.06, '3% MB'),
    (rec_id, 'RM-ADD-VIS', 0.06, '3% Vis'),
    (rec_id, 'RM-CORE-0.2', 1.00, 'Core');


    -- B. SF-2.2KG-CLEAR
    parent_sku := 'SF-2.2KG-CLEAR';
    INSERT INTO bom_headers_v2 (sku, name, machine_type, is_default)
    VALUES (parent_sku, 'Standard Recipe', 'Cast-Line', true)
    RETURNING recipe_id INTO rec_id;

    INSERT INTO bom_items_v2 (recipe_id, material_sku, qty_calculated, notes) VALUES
    (rec_id, 'RM-LL-GA1820', 1.90, '95% Body'),
    (rec_id, 'RM-ADD-VIS', 0.10, '5% Vis'),
    (rec_id, 'RM-CORE-0.2', 1.00, 'Core');


    -- C. BW-SINGLE-BLK
    parent_sku := 'BW-SINGLE-BLK';
    INSERT INTO bom_headers_v2 (sku, name, machine_type, is_default)
    VALUES (parent_sku, 'Blown Film Recipe', 'Blown-Line', true)
    RETURNING recipe_id INTO rec_id;

    INSERT INTO bom_items_v2 (recipe_id, material_sku, qty_calculated, notes) VALUES
    (rec_id, 'RM-LL-ZBB', 1.16, 'Mix'),
    (rec_id, 'RM-HD-7260', 0.97, 'Mix'),
    (rec_id, 'RM-LD-N125Y', 0.77, 'Mix'),
    (rec_id, 'RM-LL-7059', 0.77, 'Mix'),
    (rec_id, 'RM-LL-GA1820', 0.58, 'Mix'),
    (rec_id, 'RM-MB-BLK', 0.12, 'Color'),
    (rec_id, 'RM-RC-BLK', 0.08, 'Recycle');

    -- D. BW-DOUBLE-BLK
    parent_sku := 'BW-DOUBLE-BLK';
    INSERT INTO bom_headers_v2 (sku, name, machine_type, is_default)
    VALUES (parent_sku, 'Double Layer Recipe', 'Blown-Double', true)
    RETURNING recipe_id INTO rec_id;

    INSERT INTO bom_items_v2 (recipe_id, material_sku, qty_calculated, notes) VALUES
    (rec_id, 'RM-LL-ZBB', 1.71, 'Mix'),
    (rec_id, 'RM-HD-7260', 1.42, 'Mix'),
    (rec_id, 'RM-LD-N125Y', 1.14, 'Mix'),
    (rec_id, 'RM-LL-7059', 1.14, 'Mix'),
    (rec_id, 'RM-LL-GA1820', 0.85, 'Mix'),
    (rec_id, 'RM-MB-BLK', 0.18, 'Color'),
    (rec_id, 'RM-RC-BLK', 0.11, 'Recycle');

    -- E. BW-SINGLE-CLR
    parent_sku := 'BW-SINGLE-CLR';
    INSERT INTO bom_headers_v2 (sku, name, machine_type, is_default)
    VALUES (parent_sku, 'Single Layer Clear', 'Blown-Line', true)
    RETURNING recipe_id INTO rec_id;

    INSERT INTO bom_items_v2 (recipe_id, material_sku, qty_calculated, notes) VALUES
    (rec_id, 'RM-LL-ZBB', 1.21, 'Mix'),
    (rec_id, 'RM-HD-7260', 1.01, 'Mix'),
    (rec_id, 'RM-LD-N125Y', 0.81, 'Mix'),
    (rec_id, 'RM-LL-7059', 0.81, 'Mix'),
    (rec_id, 'RM-LL-GA1820', 0.61, 'Mix');
    
    -- F. BW-DOUBLE-CLR
    parent_sku := 'BW-DOUBLE-CLR';
    INSERT INTO bom_headers_v2 (sku, name, machine_type, is_default)
    VALUES (parent_sku, 'Double Layer Clear', 'Blown-Line', true)
    RETURNING recipe_id INTO rec_id;

    INSERT INTO bom_items_v2 (recipe_id, material_sku, qty_calculated, notes) VALUES
    (rec_id, 'RM-LL-ZBB', 1.79, 'Mix'),
    (rec_id, 'RM-HD-7260', 1.49, 'Mix'),
    (rec_id, 'RM-LD-N125Y', 1.19, 'Mix'),
    (rec_id, 'RM-LL-7059', 1.19, 'Mix'),
    (rec_id, 'RM-LL-GA1820', 0.89, 'Mix');

    -- G. BABYROLL-CLR
    parent_sku := 'BABYROLL-CLR';
    INSERT INTO bom_headers_v2 (sku, name, machine_type, is_default)
    VALUES (parent_sku, 'Baby Roll Recipe', 'Rewinder', true)
    RETURNING recipe_id INTO rec_id;

    INSERT INTO bom_items_v2 (recipe_id, material_sku, qty_calculated, notes) VALUES
    (rec_id, 'RM-LL-GA1820', 0.24, '95% Body'),
    (rec_id, 'RM-ADD-VIS', 0.01, '5% Vis'),
    (rec_id, 'RM-CORE-0.05', 1.00, 'Core');

    -- H. BW20CM-BLK
    parent_sku := 'BW20CM-BLK';
    INSERT INTO bom_headers_v2 (sku, name, machine_type, is_default)
    VALUES (parent_sku, '20cm Cut Black', 'Cutter', true)
    RETURNING recipe_id INTO rec_id;

    INSERT INTO bom_items_v2 (recipe_id, material_sku, qty_calculated, notes) VALUES
    (rec_id, 'RM-LL-ZBB', 0.23, 'Mix'),
    (rec_id, 'RM-HD-7260', 0.19, 'Mix'),
    (rec_id, 'RM-LD-N125Y', 0.15, 'Mix'),
    (rec_id, 'RM-LL-7059', 0.15, 'Mix'),
    (rec_id, 'RM-LL-GA1820', 0.12, 'Mix'),
    (rec_id, 'RM-MB-BLK', 0.03, 'Color'),
    (rec_id, 'RM-RC-BLK', 0.02, 'Recycle');

    -- I. BW20CM-CLR
    parent_sku := 'BW20CM-CLR';
    INSERT INTO bom_headers_v2 (sku, name, machine_type, is_default)
    VALUES (parent_sku, '20cm Cut Clear', 'Cutter', true)
    RETURNING recipe_id INTO rec_id;

    INSERT INTO bom_items_v2 (recipe_id, material_sku, qty_calculated, notes) VALUES
    (rec_id, 'RM-LL-ZBB', 0.24, 'Mix'),
    (rec_id, 'RM-HD-7260', 0.20, 'Mix'),
    (rec_id, 'RM-LD-N125Y', 0.16, 'Mix'),
    (rec_id, 'RM-LL-7059', 0.16, 'Mix'),
    (rec_id, 'RM-LL-GA1820', 0.13, 'Mix');

END $$;
