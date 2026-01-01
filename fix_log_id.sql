-- FIX: Enable Auto-ID for Production Logs
-- The error "null value in column log_id" means the DB doesn't know how to generate an ID automatically.

-- 1. Ensure UUID extension is on
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Modify Column to Default to Random UUID
ALTER TABLE public.production_logs 
ALTER COLUMN log_id SET DEFAULT gen_random_uuid();

-- 3. Safety Check: If id/log_id confusion exists
-- Ensure log_id is NOT NULL
ALTER TABLE public.production_logs 
ALTER COLUMN log_id SET NOT NULL;
