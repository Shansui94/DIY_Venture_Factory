-- ⚠️ DANGER: This script wipes all production and inventory history!
-- Use this to "Reset" the system for a fresh start.

-- 1. Clear all Production Logs (The pulse history)
TRUNCATE TABLE public.production_logs;

-- 2. Clear all Stock Movements (Reset Inventory to 0)
TRUNCATE TABLE public.stock_ledger_v2;

-- 3. (Optional) If you want to keep "Initial Balance" but clear only production:
-- DELETE FROM public.stock_ledger_v2 WHERE event_type = 'Production';
