-- Migration file: 20251210_create_production_module.sql

-- 1. Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Items Table (物品主表)
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('raw', 'product')),
    current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Recipes Table (配方头表)
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.items(id),
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    status TEXT NOT NULL CHECK (status IN ('active', 'draft', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster lookup of active recipes for a product
CREATE INDEX idx_recipes_product_status ON public.recipes(product_id, status);

-- 4. Recipe Items Table (配方详情表)
CREATE TABLE IF NOT EXISTS public.recipe_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.items(id),
    quantity NUMERIC(10, 4) NOT NULL, -- using 4 decimals for precise grams/etc
    UNIQUE(recipe_id, material_id) -- Prevent duplicate material in same recipe
);

-- 5. Inventory Transactions Table (库存流水表)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.items(id),
    change_amount NUMERIC(10, 2) NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('production_in', 'production_out', 'adjustment', 'purchase')),
    reference_id UUID, -- Optional: link to recipe_run or order
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Core Business Logic Function (核心业务逻辑)
CREATE OR REPLACE FUNCTION public.execute_production_run(
    p_recipe_id UUID,
    p_quantity NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator
AS $$
DECLARE
    v_recipe_record RECORD;
    v_recipe_item RECORD;
    v_current_stock NUMERIC;
    v_required_qty NUMERIC;
    v_product_id UUID;
    v_transaction_id UUID;
BEGIN
    -- A. Validation: Check if recipe exists and is active
    SELECT * INTO v_recipe_record FROM public.recipes WHERE id = p_recipe_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recipe not found';
    END IF;

    -- Optional: Check status (allow 'draft' for testing? strictly enforce 'active'?)
    -- logic: only active recipes can be used for official production runs
    -- IF v_recipe_record.status != 'active' THEN
    --    RAISE EXCEPTION 'Recipe is not active';
    -- END IF;

    v_product_id := v_recipe_record.product_id;

    -- B. Inventory Check (Locking rows to prevent race conditions)
    -- Iterate through all ingredients required
    FOR v_recipe_item IN 
        SELECT ri.material_id, ri.quantity, i.current_stock, i.name
        FROM public.recipe_items ri
        JOIN public.items i ON i.id = ri.material_id
        WHERE ri.recipe_id = p_recipe_id
        FOR UPDATE OF i -- Critical: Lock the item rows
    LOOP
        v_required_qty := v_recipe_item.quantity * p_quantity;
        
        IF v_recipe_item.current_stock < v_required_qty THEN
            RAISE EXCEPTION 'Insufficient stock for material: % (Required: %, Available: %)',
                v_recipe_item.name, v_required_qty, v_recipe_item.current_stock;
        END IF;
    END LOOP;

    -- C. Execution Phase
    
    -- 1. Deduct Ingredients
    FOR v_recipe_item IN 
        SELECT material_id, quantity 
        FROM public.recipe_items 
        WHERE recipe_id = p_recipe_id
    LOOP
        v_required_qty := v_recipe_item.quantity * p_quantity;
        
        -- Update Stock
        UPDATE public.items 
        SET current_stock = current_stock - v_required_qty
        WHERE id = v_recipe_item.material_id;

        -- Log Transaction
        INSERT INTO public.inventory_transactions (item_id, change_amount, action_type, reference_id)
        VALUES (v_recipe_item.material_id, -v_required_qty, 'production_out', p_recipe_id);
    END LOOP;

    -- 2. Add Finished Product
    -- Lock Product Row
    PERFORM 1 FROM public.items WHERE id = v_product_id FOR UPDATE;
    
    UPDATE public.items
    SET current_stock = current_stock + p_quantity
    WHERE id = v_product_id;

    INSERT INTO public.inventory_transactions (item_id, change_amount, action_type, reference_id)
    VALUES (v_product_id, p_quantity, 'production_in', p_recipe_id);

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Production run executed successfully',
        'recipe_id', p_recipe_id,
        'quantity', p_quantity
    );

EXCEPTION WHEN OTHERS THEN
    -- Transaction is automatically rolled back by Postgres on exception
    RAISE;
END;
$$;
