
-- SQL MIGRATION: LEGACY TO V3 (FINAL PERFECTION)
-- Prerequisite: Run update_v3_enums.sql FIRST

INSERT INTO master_items_v2 (
    sku,
    name,
    type,
    category,
    uom,
    status,
    description,
    brand,
    supplier,
    min_stock_level
)
SELECT 
    sku,
    name,
    -- Exact Type Mapping
    CASE 
        WHEN type = 'raw' THEN 'Raw'::v2_item_type
        WHEN type = 'product' THEN 'FG'::v2_item_type
        WHEN type = 'spare' THEN 'Spare'::v2_item_type
        ELSE 'Spare'::v2_item_type -- Safe fallback for unknown
    END as type,
    
    -- Category Logic
    CASE 
        WHEN type = 'spare' THEN 'SpareParts'::v2_item_category
        WHEN type = 'raw' THEN 'Resin'::v2_item_category -- Default for Raw
        ELSE 'Packaging'::v2_item_category
    END as category, 
    
    unit as uom,
    'Active' as status,
    'Imported from V2' as description,
    'Legacy' as brand,   
    'Legacy' as supplier,
    100 
FROM items
WHERE sku NOT IN (SELECT sku FROM master_items_v2) 
RETURNING sku, name, type;
