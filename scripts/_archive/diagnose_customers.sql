-- DIAGNOSTIC: CHECK TABLE STATE
-- 1. Check if customer_code column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sys_customers';

-- 2. Check Row Count
SELECT count(*) as total_customers FROM sys_customers;

-- 3. Show all rows (Limit 10) to see if data is there but hidden in UI
SELECT id, name, customer_code, zone FROM sys_customers LIMIT 10;

-- 4. Check Policies again
SELECT policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'sys_customers';
