
-- Drop the conflicting old version (which used UUID for machine_id)
-- Signature from error: (text, numeric, uuid, uuid, text, text)
DROP FUNCTION IF EXISTS execute_production_run_v3(text, numeric, uuid, uuid, text, text);

-- Also drop any other potential legacy signatures to be clean
DROP FUNCTION IF EXISTS execute_production_run_v3(text, numeric, uuid, uuid, numeric, text, text);

-- Re-affirm the correct function (Text machine_id)
CREATE OR REPLACE FUNCTION execute_production_run_v3(
    p_sku TEXT,
    p_qty DECIMAL,
    p_operator_id UUID DEFAULT NULL,
    p_machine_id TEXT DEFAULT NULL,
    p_scale_factor DECIMAL DEFAULT 1.0,
    p_job_id TEXT DEFAULT NULL,
    p_note TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_item_weight DECIMAL;
    v_recipe_id UUID;
    v_log_id UUID;
    t_row RECORD;
    v_usage_qty DECIMAL;
    v_scaled_weight DECIMAL;
BEGIN
    -- 1. Get Item Details
    SELECT net_weight_kg INTO v_item_weight FROM master_items_v2 WHERE sku = p_sku;
    
    IF v_item_weight IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item SKU not found or missing weight');
    END IF;

    v_scaled_weight := v_item_weight * p_scale_factor;

    -- 2. Find Recipe
    SELECT recipe_id INTO v_recipe_id FROM bom_headers_v2 WHERE sku = p_sku AND is_default = true LIMIT 1;
    IF v_recipe_id IS NULL THEN SELECT recipe_id INTO v_recipe_id FROM bom_headers_v2 WHERE sku = p_sku LIMIT 1; END IF;
    
    IF v_recipe_id IS NULL THEN
         RETURN jsonb_build_object('success', false, 'message', 'No active recipe found for this item');
    END IF;

    -- 3. Create Log (machine_id is TEXT here)
    INSERT INTO production_logs_v2 (sku, output_qty, machine_id, operator_id, start_time, end_time, note, job_id)
    VALUES (
        p_sku, 
        p_qty, 
        p_machine_id, 
        p_operator_id, 
        NOW(), 
        NOW(),
        COALESCE(p_note, CASE WHEN p_scale_factor != 1.0 THEN 'Scaled: ' || p_scale_factor ELSE NULL END),
        p_job_id
    )
    RETURNING log_id INTO v_log_id;

    -- 4. Deduct Materials
    FOR t_row IN SELECT * FROM bom_items_v2 WHERE recipe_id = v_recipe_id LOOP
        IF t_row.qty_calculated IS NOT NULL THEN
            v_usage_qty := (t_row.qty_calculated * p_scale_factor) * p_qty;
        ELSE
            v_usage_qty := (p_qty * v_scaled_weight) * (t_row.ratio_percentage / 100.0);
        END IF;

        INSERT INTO stock_ledger_v2 (sku, change_qty, event_type, ref_doc, notes)
        VALUES (t_row.material_sku, -v_usage_qty, 'Production Usage', v_log_id::text, 'Used for ' || p_sku);
    END LOOP;

    -- 5. Add Finished Good
    INSERT INTO stock_ledger_v2 (sku, change_qty, event_type, ref_doc, notes)
    VALUES (p_sku, p_qty, 'Production Output', v_log_id::text, 'Production Run');

    RETURN jsonb_build_object('success', true, 'log_id', v_log_id, 'message', 'Production recorded');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
