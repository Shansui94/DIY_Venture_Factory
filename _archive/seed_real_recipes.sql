-- REAL RECIPE GENERATOR (CORRECTED SKU LOGIC)
-- Based on format: PROD-BW-SL100-CLR-ORG
-- 1. Single Layer = 4.5kg, Double = 6.7kg
-- 2. Widths: 100, 50, 33... match via partial string (e.g. SL100 contains '100')
-- 3. Black Mix: 2.77% Masterbatch

INSERT INTO public.items (sku, name, type, unit, current_stock)
VALUES 
('RAW-RESIN-MIX', 'LDPE/LLDPE Resin Mix', 'raw', 'kg', 5000),
('RAW-MB-BLACK', 'Black Masterbatch', 'raw', 'kg', 500),
('RAW-MB-SILVER', 'Silver/Grey Masterbatch', 'raw', 'kg', 200)
ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name;

DO $$
DECLARE
    v_product RECORD;
    v_resin_id UUID;
    v_black_mb_id UUID;
    v_recipe_id UUID;
    
    -- Weights (Base 100cm)
    v_weight_single NUMERIC := 4.5;
    v_weight_double NUMERIC := 6.7;
    
    -- Mix Ratios
    v_black_mb_ratio NUMERIC := 0.0277; 
    v_resin_ratio_black NUMERIC := 0.9723;
    
    -- Size Scaling Factor
    v_scale_factor NUMERIC := 1.0;
    
    -- Calculated Quants
    v_qty_resin NUMERIC;
    v_qty_mb NUMERIC;
    v_base_weight NUMERIC;
BEGIN
    -- Get IDs
    SELECT id INTO v_resin_id FROM public.items WHERE sku = 'RAW-RESIN-MIX' LIMIT 1;
    SELECT id INTO v_black_mb_id FROM public.items WHERE sku = 'RAW-MB-BLACK' LIMIT 1;
    
    -- Loop all products
    FOR v_product IN SELECT id, sku, name FROM public.items WHERE type = 'product' LOOP
        
        -- A. Determine Scale (Width)
        -- Logic: Search for specific number patterns
        IF v_product.sku LIKE '%100%' THEN v_scale_factor := 1.0;
        ELSIF v_product.sku LIKE '%50%' THEN v_scale_factor := 0.5;
        ELSIF v_product.sku LIKE '%33%' THEN v_scale_factor := 0.33;
        ELSIF v_product.sku LIKE '%25%' THEN v_scale_factor := 0.25;
        ELSIF v_product.sku LIKE '%20%' THEN v_scale_factor := 0.20;
        ELSE v_scale_factor := 1.0; -- Default fallback
        END IF;

        -- B. Determine Base Weight (Single vs Double)
        -- Logic: Check for 'SL' or 'DL'
        IF v_product.sku LIKE '%SL%' THEN
            v_base_weight := v_weight_single;
        ELSE
            -- Treat DL or unknown as Double to be safe
            v_base_weight := v_weight_double;
        END IF;
        
        -- Apply Scale
        v_qty_resin := v_base_weight * v_scale_factor;
        
        -- C. Clean Old
        DELETE FROM public.recipes WHERE product_id = v_product.id;
        
        -- D. Create Recipe Header
        INSERT INTO public.recipes (product_id, name, is_default, status)
        VALUES (v_product.id, 'Standard Production (Auto-Seeded)', true, 'active')
        RETURNING id INTO v_recipe_id;
        
        -- E. Insert Ingredients
        IF v_product.sku LIKE '%BLK%' OR v_product.sku LIKE '%Black%' THEN
            -- BLACK
            v_qty_mb := v_qty_resin * v_black_mb_ratio;
            v_qty_resin := v_qty_resin * v_resin_ratio_black;
            
            INSERT INTO public.recipe_items (recipe_id, material_id, quantity)
            VALUES 
            (v_recipe_id, v_resin_id, v_qty_resin),
            (v_recipe_id, v_black_mb_id, v_qty_mb);
            
        ELSE
            -- CLEAR (100% Resin, No MB)
            INSERT INTO public.recipe_items (recipe_id, material_id, quantity)
            VALUES (v_recipe_id, v_resin_id, v_qty_resin);
        END IF;

    END LOOP;
END $$;
