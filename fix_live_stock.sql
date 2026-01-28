-- 1. TRIGGER: Auto-fill 'product_sku' in production_logs if missing
CREATE OR REPLACE FUNCTION public.enrich_production_log()
RETURNS TRIGGER AS $$
BEGIN
  -- If SKU is not provided by the machine (Firmware doesn't send it), look it up
  IF NEW.product_sku IS NULL OR NEW.product_sku = '' THEN
    SELECT product_sku INTO NEW.product_sku
    FROM public.machine_active_products
    WHERE machine_id = NEW.machine_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_production_log_insert_enrich ON public.production_logs;
CREATE TRIGGER on_production_log_insert_enrich
BEFORE INSERT ON public.production_logs
FOR EACH ROW EXECUTE PROCEDURE public.enrich_production_log();


-- 2. TRIGGER: Auto-update Stock Ledger (Inventory)
CREATE OR REPLACE FUNCTION public.update_stock_ledger_from_log()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update ledger if we have a valid SKU
  IF NEW.product_sku IS NOT NULL THEN
    INSERT INTO public.stock_ledger_v2 (
      sku,
      change_qty,
      event_type,
      ref_doc,
      notes,
      timestamp
    ) VALUES (
      NEW.product_sku,
      NEW.alarm_count, -- e.g. +1 or +2
      'Production',
      NEW.id::text,
      'Auto-Log: ' || NEW.machine_id,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_production_log_insert_ledger ON public.production_logs;
CREATE TRIGGER on_production_log_insert_ledger
AFTER INSERT ON public.production_logs
FOR EACH ROW EXECUTE PROCEDURE public.update_stock_ledger_from_log();
