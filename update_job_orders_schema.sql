-- Add missing columns to job_orders table to support Job Feed
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS original_text TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Production';

-- Optional: Add index or comments if needed
COMMENT ON COLUMN job_orders.original_text IS 'Raw user input from chat feed';
COMMENT ON COLUMN job_orders.type IS 'Type of job: Production, System, Maintenance, Note';
