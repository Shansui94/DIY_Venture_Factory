
-- auto-generate-recipes.sql
-- 为所有缺少配方的成品 (FG) 自动生成测试配方
-- 逻辑：查找 master_items_v2 中没有对应 bom_headers_v2 的条目，创建 header 和 weight=0 的 item

DO $$
DECLARE
    r_item RECORD;
    v_recipe_id UUID;
    v_raw_sku VARCHAR;
    v_count INTEGER := 0;
BEGIN
    -- 1. 找一个默认的原材料 (用于占位)
    SELECT sku INTO v_raw_sku FROM master_items_v2 WHERE type = 'Raw' LIMIT 1;
    
    -- 如果没有任何原材料，创建一个占位符
    IF v_raw_sku IS NULL THEN
        INSERT INTO master_items_v2 (sku, name, type, category, supply_type, uom)
        VALUES ('RAW-DUMMY', 'Dummy Raw Material', 'Raw', 'Resin', 'Purchased', 'kg')
        ON CONFLICT DO NOTHING;
        v_raw_sku := 'RAW-DUMMY';
    END IF;

    RAISE NOTICE 'Using Raw Material for Dummy Recipes: %', v_raw_sku;

    -- 2. 遍历所有没有配方的成品
    FOR r_item IN 
        SELECT sku, name 
        FROM master_items_v2 
        WHERE type = 'FG' 
        AND sku NOT IN (SELECT sku FROM bom_headers_v2)
    LOOP
        -- A. 创建配方头 (Header)
        INSERT INTO bom_headers_v2 (sku, name, is_default, machine_type)
        VALUES (r_item.sku, 'Auto-Gen Testing (Zero Usage)', true, 'Extruder-Auto')
        RETURNING recipe_id INTO v_recipe_id;
        
        -- B. 创建配方详情 (Item) - 用量为 0
        INSERT INTO bom_items_v2 (recipe_id, material_sku, qty_calculated, ratio_percentage, notes)
        VALUES (v_recipe_id, v_raw_sku, 0, 0, 'Auto-generated testing data');
        
        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE 'Created % dummy recipes.', v_count;
END $$;
