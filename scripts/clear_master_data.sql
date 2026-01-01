-- CLEAR MASTER DATA FOR RE-IMPORT
-- Run this in Supabase SQL Editor

TRUNCATE TABLE bom_items_v2, bom_headers_v2 CASCADE;
TRUNCATE TABLE sys_machines_v2 CASCADE;
TRUNCATE TABLE master_items_v2 CASCADE;

-- Note: This keeps users and other system prefs, but wipes the core configuration.
