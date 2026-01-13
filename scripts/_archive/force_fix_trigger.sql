
-- NUCLEAR OPTION: Completely wipe and rebuild the trigger logic

-- 1. Drop Function and Triggers (Cascade to kill any zombies)
DROP FUNCTION IF EXISTS populate_product_sku() CASCADE;

-- 2. Clean up machine_active_products just in case schema is weird
-- (Optional verify schema, but we assume it's good from prev steps)

-- 3. Recreate Function with DEBUGGED Logic
CREATE OR REPLACE FUNCTION populate_product_sku()
RETURNS TRIGGER AS $$
DECLARE
    v_lane_count INT;
    v_left_sku TEXT;
    v_right_sku TEXT;
    v_single_sku TEXT;
BEGIN
    -- [STOP RECURSION]
    -- If SKU is already provided (e.g. by the Trigger splitting), STOP.
    IF NEW.product_sku IS NOT NULL AND NEW.product_sku != 'UNKNOWN' THEN
        RETURN NEW;
    END IF;

    -- [COUNT ACTIVE LANES]
    SELECT COUNT(*) INTO v_lane_count 
    FROM machine_active_products 
    WHERE machine_id = NEW.machine_id;

    -- [SCENARIO A: SINGLE LANE] (Count <= 1)
    -- This handles: 'Single', 'Left' only, 'Right' only.
    IF v_lane_count <= 1 THEN
        SELECT product_sku INTO v_single_sku 
        FROM machine_active_products 
        WHERE machine_id = NEW.machine_id LIMIT 1;

        -- Apply SKU
        NEW.product_sku := COALESCE(v_single_sku, 'UNKNOWN');
        -- ALARM COUNT: Stays as Firmware sent it (Default 2)
    
    -- [SCENARIO B: DUAL LANE] (Count > 1)
    -- This handles: 'Left' + 'Right' active together
    ELSE
        -- Fetch Left & Right SKUs explicitly
        SELECT product_sku INTO v_left_sku FROM machine_active_products WHERE machine_id = NEW.machine_id AND lane_id = 'Left';
        SELECT product_sku INTO v_right_sku FROM machine_active_products WHERE machine_id = NEW.machine_id AND lane_id = 'Right';

        -- 1. Modify The PRIMARY Log (ROW A) to be LEFT
        NEW.product_sku := COALESCE(v_left_sku, 'UNKNOWN-LEFT');
        NEW.alarm_count := 1; -- FORCE TO 1 (Split)

        -- 2. Create The SECONDARY Log (ROW B) to be RIGHT
        IF v_right_sku IS NOT NULL THEN
            INSERT INTO production_logs (machine_id, product_sku, alarm_count, created_at)
            VALUES (NEW.machine_id, v_right_sku, 1, NEW.created_at);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate Trigger
CREATE TRIGGER trigger_populate_sku
BEFORE INSERT ON production_logs
FOR EACH ROW
EXECUTE FUNCTION populate_product_sku();

-- 5. Notify User logic updated
SELECT 'TRIGGER REBUILT SUCCESSFULLY' as status;
