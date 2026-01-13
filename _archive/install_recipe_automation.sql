-- AUTOMATED RECIPE TRIGGER
-- Logic: Whenever a new product is created, this code runs automatically.
-- It reads the SKU (Code) to decide the Recipe.

CREATE OR REPLACE FUNCTION public.handle_new_product_recipe()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_resin_id UUID;
    v_black_mb_id UUID;
    v_recipe_id UUID;
    
    -- Base Weights (100cm Standard)
    v_weight_single NUMERIC := 4.5;
    v_weight_double NUMERIC := 6.7;
    
    -- Ratios
    v_black_mb_ratio NUMERIC := 0.0277;    -- ~2.77%
    v_resin_ratio_black NUMERIC := 0.9723; -- ~97.23%
    
    -- Calculation Variables
    v_base_weight NUMERIC;
    v_scale_factor NUMERIC := 1.0;
    v_final_resin NUMERIC;
    v_final_mb NUMERIC;
BEGIN
    -- 0. Safety Check: Only run for 'product' type
    IF NEW.type != 'product' THEN RETURN NEW; END IF;

    -- 1. Get Material IDs (Assumes these exist from seed script)
    SELECT id INTO v_resin_id FROM public.items WHERE sku = 'RAW-RESIN-MIX' LIMIT 1;
    SELECT id INTO v_black_mb_id FROM public.items WHERE sku = 'RAW-MB-BLACK' LIMIT 1;
    
    -- If materials missing, do nothing (log error optionally)
    IF v_resin_id IS NULL THEN RETURN NEW; END IF;

    -- 2. Analyze SKU for Layer (Single vs Double)
    -- Looks for "SL" or "DL" inside the SKU string
    IF NEW.sku LIKE '%SL%' THEN
        v_base_weight := v_weight_single;
    ELSE
        -- Default to Double (Heavier) to be safe, or check DL
        v_base_weight := v_weight_double;
    END IF;

    -- 3. Analyze SKU for Width (Scaling)
    IF NEW.sku LIKE '%100%' THEN v_scale_factor := 1.0;
    ELSIF NEW.sku LIKE '%50%' THEN v_scale_factor := 0.5;
    ELSIF NEW.sku LIKE '%33%' THEN v_scale_factor := 0.33;
    ELSIF NEW.sku LIKE '%25%' THEN v_scale_factor := 0.25;
    ELSIF NEW.sku LIKE '%20%' THEN v_scale_factor := 0.20;
    ELSE v_scale_factor := 1.0; 
    END IF;

    -- 4. Calculate Total Product Weight
    v_final_resin := v_base_weight * v_scale_factor;

    -- 5. Create Recipe Header
    INSERT INTO public.recipes (product_id, name, is_default, status)
    VALUES (NEW.id, 'Auto-Generated Standard', true, 'active')
    RETURNING id INTO v_recipe_id;

    -- 6. Add Ingredients (Black vs Clear)
    IF NEW.sku LIKE '%BLK%' OR NEW.sku LIKE '%Black%' THEN
        -- BLACK RECIPE: Mix Resin + MB
        v_final_mb := v_final_resin * v_black_mb_ratio;
        v_final_resin := v_final_resin * v_resin_ratio_black; -- Reduce resin to make room for MB
        
        INSERT INTO public.recipe_items (recipe_id, material_id, quantity)
        VALUES 
        (v_recipe_id, v_resin_id, v_final_resin),
        (v_recipe_id, v_black_mb_id, v_final_mb);
    ELSE
        -- CLEAR RECIPE: 100% Resin
        INSERT INTO public.recipe_items (recipe_id, material_id, quantity)
        VALUES (v_recipe_id, v_resin_id, v_final_resin);
    END IF;

    RETURN NEW;
END;
$$;

-- Drop trigger if exists to avoid duplication
DROP TRIGGER IF EXISTS on_product_created ON public.items;

-- Attach Trigger to Items table
CREATE TRIGGER on_product_created
    AFTER INSERT ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_product_recipe();

