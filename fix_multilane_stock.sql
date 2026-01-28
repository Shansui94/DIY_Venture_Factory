-- 1. DROP old triggers to prevent double-counting
DROP TRIGGER IF EXISTS on_production_log_insert_enrich ON public.production_logs;
DROP TRIGGER IF EXISTS on_production_log_insert_ledger ON public.production_logs;
DROP FUNCTION IF EXISTS public.enrich_production_log();
DROP FUNCTION IF EXISTS public.update_stock_ledger_from_log();

-- 2. NEW TRIGGER: Smart Distribution
CREATE OR REPLACE FUNCTION public.distribute_production_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
  rec RECORD;
  product_count INTEGER;
  qty_per_product NUMERIC;
BEGIN
  -- 1. Count how many active products this machine has
  SELECT COUNT(*) INTO product_count
  FROM public.machine_active_products
  WHERE machine_id = NEW.machine_id;

  -- 2. If no products, do nothing (or log warning?)
  IF product_count = 0 THEN
    RETURN NEW;
  END IF;

  -- 3. Calculate quantity per product (FORCE DECIMAL DIVISION)
  -- Cast to NUMERIC to prevent integer division (1/2 = 0).
  qty_per_product := NEW.alarm_count::NUMERIC / product_count;

  -- 4. Loop through ALL active products and update ledger
  FOR rec IN 
    SELECT product_sku 
    FROM public.machine_active_products 
    WHERE machine_id = NEW.machine_id
  LOOP
    INSERT INTO public.stock_ledger_v2 (
      sku,
      change_qty,
      event_type,
      ref_doc,
      notes,
      timestamp
    ) VALUES (
      rec.product_sku,
      qty_per_product,
      'Production',
      NEW.id::text,
      'Auto-Log: ' || NEW.machine_id || ' (Split ' || product_count || ')',
      NOW()
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger
DROP TRIGGER IF EXISTS on_production_log_insert_distribute ON public.production_logs;
CREATE TRIGGER on_production_log_insert_distribute
AFTER INSERT ON public.production_logs
FOR EACH ROW EXECUTE PROCEDURE public.distribute_production_to_ledger();
