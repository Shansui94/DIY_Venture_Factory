-- Remove obsolete 'Single' lane configuration since we are using Dual (Left/Right)
DELETE FROM public.machine_active_products 
WHERE machine_id = 'T1.2-M01' 
AND lane_id = 'Single';

-- Verify only Left and Right remain
SELECT * FROM public.machine_active_products WHERE machine_id = 'T1.2-M01';
