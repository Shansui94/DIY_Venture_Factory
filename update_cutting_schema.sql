-- 1. Add base_width to sys_machines_v2
ALTER TABLE public.sys_machines_v2 
ADD COLUMN IF NOT EXISTS base_width INTEGER DEFAULT 100;

-- 2. Update base_width values based on user input
UPDATE public.sys_machines_v2 SET base_width = 100 WHERE machine_id IN ('N1-M01', 'N2-M02', 'T1.3-M02');
UPDATE public.sys_machines_v2 SET base_width = 200 WHERE machine_id = 'T1.2-M01';
UPDATE public.sys_machines_v2 SET base_width = 50 WHERE machine_id = 'T1.1-M03'; -- Special case for stretch

-- 3. Update iot_device_configs to support cutting size
ALTER TABLE public.iot_device_configs
ADD COLUMN IF NOT EXISTS cutting_size INTEGER DEFAULT 100;

-- 4. Create a function or trigger to auto-calculate yield? 
-- Actually, we can just do it in the API to keep it flexible.
