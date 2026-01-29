-- Inspect Table Definition
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'stock_ledger_v2';

-- Inspect Triggers
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'stock_ledger_v2';

-- Inspect Functions (Source Code) to see what is actually in the DB
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('record_stock_movement', 'record_driver_stock_movement');
