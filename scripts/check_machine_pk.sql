
SELECT column_name, data_type, is_identity 
FROM information_schema.columns 
WHERE table_name = 'sys_machines_v2';
