-- 🚨 PACKSECURE MIGRATION PROTOCOL (V1 -> V2) 🚨

BEGIN;

-- STEP 1: Ensure V2 Enums support our business reality (Bubble Wrap & Manufacturing)
-- We add 'IF NOT EXISTS' to avoid errors if they are already there.
ALTER TYPE v2_item_type ADD VALUE IF NOT EXISTS 'Raw';
ALTER TYPE v2_item_type ADD VALUE IF NOT EXISTS 'FG'; -- Finished Goods
ALTER TYPE v2_item_type ADD VALUE IF NOT EXISTS 'WiP'; -- Work in Progress

ALTER TYPE v2_item_category ADD VALUE IF NOT EXISTS 'Resin';
ALTER TYPE v2_item_category ADD VALUE IF NOT EXISTS 'BubbleWrap'; -- Specific for your product
ALTER TYPE v2_item_category ADD VALUE IF NOT EXISTS 'Packaging';

-- STEP 2: Migrate Items -> Master Items V2
-- Logic: Map 'raw' -> 'Raw'/'Resin', Map 'product' -> 'FG'/'BubbleWrap'
INSERT INTO master_items_v2 (sku, name, type, category, uom, status, min_stock_level)
SELECT 
    sku, 
    name, 
    -- Type Mapping (Force Cast)
    CASE 
        WHEN lower(type) = 'raw' THEN 'Raw'::v2_item_type 
        ELSE 'FG'::v2_item_type 
    END,
    -- Category Mapping (Force Cast)
    CASE 
        WHEN lower(type) = 'raw' THEN 'Resin'::v2_item_category 
        ELSE 'BubbleWrap'::v2_item_category -- Defaulting all legacy products to BubbleWrap
    END,
    COALESCE(unit, 'Unit'),
    'Active',
    0
FROM items 
WHERE sku NOT IN (SELECT sku FROM master_items_v2);

-- STEP 3: Migrate Machines -> Sys Machines V2
INSERT INTO sys_machines_v2 (machine_id, name, type, status)
SELECT 
    code, -- Use legacy code as new ID
    name,
    COALESCE(type, 'Extruder'),
    -- Status Mapping (Force Cast)
    CASE 
        WHEN status = 'Running' THEN 'Running'::v2_machine_status
        ELSE 'Idle'::v2_machine_status
    END
FROM machines 
WHERE code NOT IN (SELECT machine_id FROM sys_machines_v2);

COMMIT;

-- Report counts
SELECT 'Items Migrated' as metric, count(*) as val FROM master_items_v2
UNION ALL
SELECT 'Machines Migrated', count(*) FROM sys_machines_v2;
