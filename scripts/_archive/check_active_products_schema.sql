
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'machine_active_products';

SELECT * FROM machine_active_products LIMIT 5;
