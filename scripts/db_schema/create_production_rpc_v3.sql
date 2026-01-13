
-- Function: execute_production_run_v3
-- UPDATED: Adds p_scale_factor to support different widths (e.g. 50cm = 0.5)

CREATE OR REPLACE FUNCTION execute_production_run_v3(
    p_sku TEXT,
    p_qty DECIMAL,
    p_operator_id UUID DEFAULT NULL,
    p_machine_id TEXT DEFAULT NULL,
    p_scale_factor DECIMAL DEFAULT 1.0  -- NEW PARAMETER
) RETURNS JSONB AS $$
DECLARE
    v_item_weight DECIMAL;
    v_recipe_id UUID;
    v_log_id UUID;
    t_row RECORD;
    v_usage_qty DECIMAL;
    v_scaled_weight DECIMAL;
BEGIN
    -- 1. Get Item Details (Base Weight for 1 Unit of the mapped SKU)
    SELECT net_weight_kg INTO v_item_weight 
    FROM master_items_v2 WHERE sku = p_sku;

    IF v_item_weight IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item SKU not found or missing weight');
    END IF;

    -- Adjust weight by scale factor (e.g. 1m * 0.5 = 50cm weight)
    v_scaled_weight := v_item_weight * p_scale_factor;

    -- 2. Find Default Recipe
    SELECT recipe_id INTO v_recipe_id 
    FROM bom_headers_v2 
    WHERE sku = p_sku AND is_default = true 
    LIMIT 1;

    -- Fallback
    IF v_recipe_id IS NULL THEN
        SELECT recipe_id INTO v_recipe_id 
        FROM bom_headers_v2 
        WHERE sku = p_sku 
        LIMIT 1;
    END IF;
    
    IF v_recipe_id IS NULL THEN
         RETURN jsonb_build_object('success', false, 'message', 'No active recipe found for this item');
    END IF;

    -- 3. Create Production Log
    INSERT INTO production_logs_v2 (sku, output_qty, machine_id, operator_id, start_time, end_time, note)
    VALUES (
        p_sku, 
        p_qty, 
        p_machine_id, 
        p_operator_id, 
        NOW(), 
        NOW(),
        CASE WHEN p_scale_factor != 1.0 THEN 'Scaled Production: ' || p_scale_factor ELSE NULL END
    )
    RETURNING log_id INTO v_log_id;

    -- 4. Deduct Raw Materials (The Recipe Loop)
    -- Formula: Total Job Weight = p_qty * v_scaled_weight
    
    FOR t_row IN SELECT * FROM bom_items_v2 WHERE recipe_id = v_recipe_id LOOP
        IF t_row.qty_calculated IS NOT NULL THEN
            -- Fixed usage (like Cores) -> usually 1 per roll REGARDLESS of width?
            -- Actually, shorter rolls use shorter cores (lighter).
            -- So we assume ALL components scale, unless specifically marked static. 
            -- For MVP, we scale everything.
            v_usage_qty := (t_row.qty_calculated * p_scale_factor) * p_qty;
        ELSE
            -- Ratio usage
            v_usage_qty := (p_qty * v_scaled_weight) * (t_row.ratio_percentage / 100.0);
        END IF;

        -- Insert Ledger
        INSERT INTO stock_ledger_v2 (sku, change_qty, event_type, ref_doc, notes)
        VALUES (
            t_row.material_sku, 
            -v_usage_qty, 
            'Production Usage', 
            v_log_id::text, 
            'Used for ' || p_sku || ' (Scale: ' || p_scale_factor || ')'
        );
    END LOOP;

    -- 5. Add Finished Good
    -- Note: We add the Base SKU to stock, but maybe we should note the variation?
    -- V2 system isn't granular enough for infinite SKU variations yet, so we track main SKU.
    INSERT INTO stock_ledger_v2 (sku, change_qty, event_type, ref_doc, notes)
    VALUES (
        p_sku, 
        p_qty, 
        'Production Output', 
        v_log_id::text, 
        'Production Run (Scale: ' || p_scale_factor || ')'
    );

    RETURN jsonb_build_object('success', true, 'log_id', v_log_id, 'message', 'Production recorded with scale ' || p_scale_factor);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
