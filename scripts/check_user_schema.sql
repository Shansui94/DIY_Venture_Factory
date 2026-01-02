
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sys_users_v2' AND column_name = 'id';
