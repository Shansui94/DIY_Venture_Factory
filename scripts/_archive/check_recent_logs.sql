
SELECT id, machine_id, alarm_count, created_at 
FROM production_logs 
ORDER BY created_at DESC 
LIMIT 10;
