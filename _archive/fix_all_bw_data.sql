
-- Universal Fix for ALL Bubble Wrap Items
-- 1. Mass Update Weight to 0.0 where it is NULL
UPDATE master_items_v2
SET net_weight_kg = 0.0
WHERE type = 'FG' AND sku LIKE 'BW%' AND net_weight_kg IS NULL;

-- 2. Mass Insert 'test' Recipes for ALL BW items that lack one
-- We select all BW SKUs from master_items_v2, and try to insert a recipe.
-- ON CONFLICT DO NOTHING ensures we don't break existing ones.

INSERT INTO bom_headers_v2 (sku, name, is_default, machine_type)
SELECT sku, 'test', true, 'Extruder'
FROM master_items_v2
WHERE type = 'FG' AND sku LIKE 'BW%'
ON CONFLICT DO NOTHING;
