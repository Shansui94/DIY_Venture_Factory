
-- Update schema for V3 3-Layer Architecture

ALTER TABLE master_items_v2 ADD COLUMN IF NOT EXISTS supplier VARCHAR(100);
ALTER TABLE master_items_v2 ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE master_items_v2 ADD COLUMN IF NOT EXISTS function_usage TEXT;
ALTER TABLE master_items_v2 ADD COLUMN IF NOT EXISTS legacy_code VARCHAR(50);
ALTER TABLE master_items_v2 ADD COLUMN IF NOT EXISTS packaging_type VARCHAR(50);
ALTER TABLE master_items_v2 ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE master_items_v2 ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER DEFAULT 0;

ALTER TABLE bom_items_v2 ADD COLUMN IF NOT EXISTS scrap_percent DECIMAL(5,4) DEFAULT 0.03;
ALTER TABLE bom_items_v2 ADD COLUMN IF NOT EXISTS usage_note TEXT;

-- Verify columns exist (this won't output to JS console easily but ensures DB state)
SELECT column_name FROM information_schema.columns WHERE table_name = 'master_items_v2';
