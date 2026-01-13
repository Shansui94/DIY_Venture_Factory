
-- NUCLEAR OPTION 2: Fix Single Lane Count Logic

DROP FUNCTION IF EXISTS populate_product_sku() CASCADE;

CREATE OR REPLACE FUNCTION populate_product_sku()
RETURNS TRIGGER AS $$
DECLARE
    v_lane_count INT;
    v_left_sku TEXT;
    v_right_sku TEXT;
    v_single_sku TEXT;
BEGIN
    -- [STOP RECURSION]
    IF NEW.product_sku IS NOT NULL AND NEW.product_sku != 'UNKNOWN' THEN
        RETURN NEW;
    END IF;

    -- [FETCH POTENTIAL SKUS]
    SELECT product_sku INTO v_left_sku FROM machine_active_products WHERE machine_id = NEW.machine_id AND lane_id = 'Left';
    SELECT product_sku INTO v_right_sku FROM machine_active_products WHERE machine_id = NEW.machine_id AND lane_id = 'Right';
    SELECT product_sku INTO v_single_sku FROM machine_active_products WHERE machine_id = NEW.machine_id AND lane_id = 'Single';

    -- [SCENARIO 1: DUAL LANE ACTIVE (BOTH LEFT AND RIGHT)]
    IF v_left_sku IS NOT NULL AND v_right_sku IS NOT NULL THEN
        -- Split into two logs of 1 each
        -- Log A (This one) = Left
        NEW.product_sku := v_left_sku;
        NEW.alarm_count := 1; 

        -- Log B (Insert new) = Right
        INSERT INTO production_logs (machine_id, product_sku, alarm_count, created_at)
        VALUES (NEW.machine_id, v_right_sku, 1, NEW.created_at);
        
        RETURN NEW;
    END IF;

    -- [SCENARIO 2: PARTIAL DUAL / SINGLE LANE]
    -- If we are here, it means we DON'T have both Left and Right.
    -- We have either Left, Right, Single, or Nothing.
    -- In all these cases, we keep ONE log, but ensure Count is 2 (Firmware Default).

    IF v_left_sku IS NOT NULL THEN
        NEW.product_sku := v_left_sku;
        NEW.alarm_count := 2; -- Ensure it's 2
    
    ELSIF v_right_sku IS NOT NULL THEN
        NEW.product_sku := v_right_sku;
        NEW.alarm_count := 2; -- Ensure it's 2

    ELSIF v_single_sku IS NOT NULL THEN
        NEW.product_sku := v_single_sku;
        NEW.alarm_count := 2; -- Ensure it's 2
        
    ELSE
        NEW.product_sku := 'UNKNOWN';
        NEW.alarm_count := 2; -- Default to 2 for unknown
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_populate_sku
BEFORE INSERT ON production_logs
FOR EACH ROW
EXECUTE FUNCTION populate_product_sku();

SELECT 'TRIGGER UPDATED FOR +2 LOGIC' as status;
