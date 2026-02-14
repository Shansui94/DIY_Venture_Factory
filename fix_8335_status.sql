
-- Run this in your Supabase SQL Editor to unblock the user

-- 1. Force update users_public (This is the one blocking login)
UPDATE users_public 
SET status = 'Active' 
WHERE email = '8335@packsecure.com';

-- 2. Ensure sys_users_v2 is also correct (Just in case)
UPDATE sys_users_v2 
SET status = 'Active', pin_code = '8335' 
WHERE email = '8335@packsecure.com';
