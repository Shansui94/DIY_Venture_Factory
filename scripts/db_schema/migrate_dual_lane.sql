
-- 1. Drop existing table (it's temporary anyway)
DROP TABLE IF EXISTS machine_active_products;

-- 2. New Table with Lane Support
CREATE TABLE machine_active_products (
    machine_id TEXT NOT NULL,
    lane_id TEXT NOT NULL DEFAULT 'Single', -- 'Left', 'Right', 'Single'
    product_sku TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (machine_id, lane_id)
);

-- 3. Enable RLS
ALTER TABLE machine_active_products ENABLE ROW LEVEL SECURITY;

-- 4. Allow All Access (Internal Tool)
CREATE POLICY "Allow All" ON machine_active_products 
FOR ALL USING (true) WITH CHECK (true);

-- 5. Updated Trigger to Handle Dual Lane Logic
CREATE OR REPLACE FUNCTION populate_product_sku()
RETURNS TRIGGER AS $$
DECLARE
    v_lane_count INT;
    v_left_sku TEXT;
    v_right_sku TEXT;
    v_single_sku TEXT;
BEGIN
    -- Check how many active configurations we have for this machine
    SELECT COUNT(*) INTO v_lane_count 
    FROM machine_active_products 
    WHERE machine_id = NEW.machine_id;

    -- Scenario A: Single Lane / Standard Mode (Or only one set)
    IF v_lane_count <= 1 THEN
        SELECT product_sku INTO v_single_sku 
        FROM machine_active_products 
        WHERE machine_id = NEW.machine_id LIMIT 1;

        -- Default if missing
        IF v_single_sku IS NULL THEN v_single_sku := 'UNKNOWN'; END IF;

        NEW.product_sku := v_single_sku;
        -- alarm_count stays as whatever Firmware sent (Default 2)
        -- Firmware sends 2. So we record 2. Correct.
    
    -- Scenario B: Dual Lane Mode (Two Active Products)
    ELSE
        -- We have a Left and a Right config
        SELECT product_sku INTO v_left_sku FROM machine_active_products WHERE machine_id = NEW.machine_id AND lane_id = 'Left';
        SELECT product_sku INTO v_right_sku FROM machine_active_products WHERE machine_id = NEW.machine_id AND lane_id = 'Right';

        -- Logic: Firmware sends ONE signal with count=2.
        -- We want to record: 1x Left SKU, 1x Right SKU.
        
        -- Step 1: Update THIS row (NEW) to be the "Left" one.
        NEW.product_sku := COALESCE(v_left_sku, 'UNKNOWN-LEFT');
        NEW.alarm_count := 1; -- Split count

        -- Step 2: Insert a SECOND row for the "Right" one.
        -- We must use TG_OP to avoid infinite recursion if we insert into same table?
        -- Actually, we are inserting into production_logs. Trigger is on production_logs.
        -- If we insert into production_logs, this trigger fires again.
        -- We need to prevent infinite loop.
        -- We can add a flag or check if product_sku is already set?
        -- Or we can just insert with a special context?
        
        -- Better approach: Check if product_sku is NULL (which it is for firmware insert).
        -- If we insert a second row, we can explicitly SET the product_sku in the insert statement.
        -- Then the trigger sees product_sku IS NOT NULL and does nothing? 
        -- Let's update the trigger top logic to skip if SKU is already present.

        INSERT INTO production_logs (machine_id, product_sku, alarm_count, created_at)
        VALUES (NEW.machine_id, COALESCE(v_right_sku, 'UNKNOWN-RIGHT'), 1, NEW.created_at);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Important: Update Trigger Condition to prevent recursion
-- Modify the function slightly to exit early if SKU is provided (which we do for the secondary insert)
CREATE OR REPLACE FUNCTION populate_product_sku()
RETURNS TRIGGER AS $$
DECLARE
    v_lane_count INT;
    v_left_sku TEXT;
    v_right_sku TEXT;
    v_single_sku TEXT;
BEGIN
    -- EXIT if SKU is already provided (e.g. by Backend or Secondary Insert)
    IF NEW.product_sku IS NOT NULL AND NEW.product_sku != 'UNKNOWN' THEN
        RETURN NEW;
    END IF;

    -- [Rest of Logic Same as Above]
    -- Check how many active configurations we have for this machine
    SELECT COUNT(*) INTO v_lane_count 
    FROM machine_active_products 
    WHERE machine_id = NEW.machine_id;

    -- Scenario A: Single Lane / Standard Mode (Or only one set)
    IF v_lane_count <= 1 THEN
        SELECT product_sku INTO v_single_sku 
        FROM machine_active_products 
        WHERE machine_id = NEW.machine_id LIMIT 1;
        
        NEW.product_sku := COALESCE(v_single_sku, 'UNKNOWN');
        -- Count remains 2
    
    -- Scenario B: Dual Lane Mode
    ELSE
        SELECT product_sku INTO v_left_sku FROM machine_active_products WHERE machine_id = NEW.machine_id AND lane_id = 'Left';
        SELECT product_sku INTO v_right_sku FROM machine_active_products WHERE machine_id = NEW.machine_id AND lane_id = 'Right';

        -- Make THIS row the Left one
        NEW.product_sku := COALESCE(v_left_sku, 'UNKNOWN-LEFT');
        NEW.alarm_count := 1; 

        -- Insert the Right one (explicit SKU provided, so Trigger will skip it)
        INSERT INTO production_logs (machine_id, product_sku, alarm_count, created_at)
        VALUES (NEW.machine_id, COALESCE(v_right_sku, 'UNKNOWN-RIGHT'), 1, NEW.created_at);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
