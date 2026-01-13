
-- Add lane_id to production_logs
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS lane_id TEXT;

-- Rebuild Trigger to populate lane_id
DROP FUNCTION IF EXISTS populate_product_sku() CASCADE;

CREATE OR REPLACE FUNCTION populate_product_sku()
RETURNS TRIGGER AS $$
DECLARE
    v_left_sku TEXT;
    v_right_sku TEXT;
    v_single_sku TEXT;
BEGIN
    IF NEW.product_sku IS NOT NULL AND NEW.product_sku != 'UNKNOWN' THEN RETURN NEW; END IF;

    SELECT product_sku INTO v_left_sku FROM machine_active_products WHERE machine_id = NEW.machine_id AND lane_id = 'Left';
    SELECT product_sku INTO v_right_sku FROM machine_active_products WHERE machine_id = NEW.machine_id AND lane_id = 'Right';
    SELECT product_sku INTO v_single_sku FROM machine_active_products WHERE machine_id = NEW.machine_id AND lane_id = 'Single';

    -- DUAL LANE
    IF v_left_sku IS NOT NULL AND v_right_sku IS NOT NULL THEN
        -- Log A (Left)
        NEW.product_sku := v_left_sku;
        NEW.alarm_count := 1; 
        NEW.lane_id := 'Left'; -- NEW

        -- Log B (Right)
        INSERT INTO production_logs (machine_id, product_sku, alarm_count, created_at, lane_id)
        VALUES (NEW.machine_id, v_right_sku, 1, NEW.created_at, 'Right'); -- NEW
        
        RETURN NEW;
    END IF;

    -- SINGLE / PARTIAL
    NEW.alarm_count := 2; 
    IF v_left_sku IS NOT NULL THEN 
        NEW.product_sku := v_left_sku;
        NEW.lane_id := 'Left';
    ELSIF v_right_sku IS NOT NULL THEN 
        NEW.product_sku := v_right_sku;
        NEW.lane_id := 'Right';
    ELSIF v_single_sku IS NOT NULL THEN 
        NEW.product_sku := v_single_sku;
        NEW.lane_id := 'Single';
    ELSE 
        NEW.product_sku := 'UNKNOWN';
        NEW.lane_id := 'Unknown';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_populate_sku
BEFORE INSERT ON production_logs
FOR EACH ROW
EXECUTE FUNCTION populate_product_sku();
