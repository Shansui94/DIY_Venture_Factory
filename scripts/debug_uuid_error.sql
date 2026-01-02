
-- Check table column types
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'production_logs_v2' AND column_name = 'machine_id';

-- Check function arguments
SELECT pg_get_function_arguments('execute_production_run_v3'::regproc);
