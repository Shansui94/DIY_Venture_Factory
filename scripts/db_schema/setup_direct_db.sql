
-- 1. Enable RLS (if not already)
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

-- 2. Allow "Anyone" (ESP32 with Anon Key) to INSERT data
CREATE POLICY "Allow Anon Insert" 
ON production_logs 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- 3. Allow "Anyone" to READ data (for Dashboard)
CREATE POLICY "Allow Anon Select" 
ON production_logs 
FOR SELECT 
TO anon, authenticated
USING (true);

-- 4. Create Function to Auto-Fill SKU
CREATE OR REPLACE FUNCTION populate_product_sku()
RETURNS TRIGGER AS $$
BEGIN
  -- Look up the active product for this machine
  SELECT product_sku INTO NEW.product_sku
  FROM machine_active_products
  WHERE machine_id = NEW.machine_id
  LIMIT 1;
  
  -- Default if not found
  IF NEW.product_sku IS NULL THEN
    NEW.product_sku := 'UNKNOWN';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create Trigger (Runs BEFORE every insert)
DROP TRIGGER IF EXISTS trigger_populate_sku ON production_logs;

CREATE TRIGGER trigger_populate_sku
BEFORE INSERT ON production_logs
FOR EACH ROW
EXECUTE FUNCTION populate_product_sku();
