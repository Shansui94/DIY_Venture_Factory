-- ⚠️ SAFE CLEANUP SCRIPT (Delete duplicates, keep latest)
-- Since there is no 'id' column, we use the internal 'ctid' column.

-- 1. View what will be deleted (Run this first to check)
SELECT * FROM public.machine_active_products a
WHERE a.ctid NOT IN (
    SELECT MAX(b.ctid)
    FROM public.machine_active_products b
    GROUP BY b.machine_id, b.lane_id
);

-- 2. Execute Deletion
DELETE FROM public.machine_active_products a
WHERE a.ctid NOT IN (
    SELECT MAX(b.ctid)
    FROM public.machine_active_products b
    GROUP BY b.machine_id, b.lane_id
);

-- 3. Verify Result (Should only show 1 row per Lane)
SELECT * FROM public.machine_active_products WHERE machine_id = 'T1.2-M01';
