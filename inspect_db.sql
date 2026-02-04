-- Inspect Triggers on production_logs
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'production_logs';

-- Inspect Trigger Functions source
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('update_last_active', 'handle_production_log_insert', 'handle_new_log');
