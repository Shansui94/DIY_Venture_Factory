-- ==========================================
-- Delivery Confirmation Trigger
-- Purpose: Permanently deduct stock when a Delivery Order is completed.
-- ==========================================

-- 1. Create the Trigger Function
CREATE OR REPLACE FUNCTION public.handle_delivery_completion()
RETURNS TRIGGER AS $$
DECLARE
    item_record jsonb;
    item_sku VARCHAR;
    item_qty NUMERIC;
BEGIN
    -- Only trigger when status changes to 'Delivered' or 'Completed'
    -- AND the old status was NOT 'Delivered'/'Completed' (prevent double deduction)
    IF (NEW.status IN ('Delivered', 'Completed')) AND (OLD.status NOT IN ('Delivered', 'Completed')) THEN
        
        -- Iterate through the items JSON array
        FOR item_record IN SELECT * FROM jsonb_array_elements(NEW.items)
        LOOP
            item_sku := item_record ->> 'sku';
            item_qty := (item_record ->> 'quantity')::NUMERIC;

            -- Insert ledger entry for deduction
            IF item_sku IS NOT NULL AND item_qty > 0 THEN
                INSERT INTO public.stock_ledger_v2 (
                    sku,
                    change_qty,
                    change_type,
                    ref_id,
                    notes,
                    timestamp
                ) VALUES (
                    item_sku,
                    -item_qty, -- NEGATIVE Quantity for deduction
                    'Delivery',
                    NEW.id::VARCHAR, -- Reference the Order ID
                    'DO: ' || NEW.order_number,
                    NOW()
                );
            END IF;
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bind the Trigger to the Table
DROP TRIGGER IF EXISTS on_delivery_completed ON public.sales_orders;

CREATE TRIGGER on_delivery_completed
AFTER UPDATE ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_delivery_completion();
