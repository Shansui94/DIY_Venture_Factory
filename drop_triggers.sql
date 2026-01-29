-- FOUND THE CULPRIT!
-- The trigger 'on_delivery_completed' calls function 'handle_delivery_completion'
-- calling 'change_type' (which doesn't exist anymore).

-- 1. Drop the Trigger on sales_orders
DROP TRIGGER IF EXISTS on_delivery_completed ON public.sales_orders;

-- 2. Drop the Function
DROP FUNCTION IF EXISTS public.handle_delivery_completion() CASCADE;

-- 3. Also cleanup any other potential triggers
DROP TRIGGER IF EXISTS on_delivery_update ON public.sales_orders;
DROP FUNCTION IF EXISTS public.handle_delivery_update() CASCADE;

-- 4. Final Safety: Adjust column if needed (Consolidate to event_type)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stock_ledger_v2') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'stock_ledger_v2' AND column_name = 'change_type') THEN
            ALTER TABLE "public"."stock_ledger_v2" RENAME COLUMN "change_type" TO "event_type";
        END IF;
    END IF;
END $$;
