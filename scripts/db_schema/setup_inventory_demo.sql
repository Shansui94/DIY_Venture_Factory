
-- 1. Create the High-Performance View
-- This view aggregates all transactions to calculate current Stock on Hand
CREATE OR REPLACE VIEW v2_inventory_snapshot AS
SELECT 
    m.sku,
    m.name as item_name,
    m.type as item_type,
    m.category,
    m.min_stock_level,
    m.uom,
    COALESCE(SUM(l.change_qty), 0) as current_stock,
    MAX(l.timestamp) as last_updated
FROM master_items_v2 m
LEFT JOIN stock_ledger_v2 l ON m.sku = l.sku
GROUP BY m.sku, m.name, m.type, m.category, m.min_stock_level, m.uom;

-- 2. Seed "Demo" Initial Stock (Only if ledger is empty)
-- This gives the user something to look at immediately.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM stock_ledger_v2) THEN
        -- Seed Raw Materials (healthy stock)
        INSERT INTO stock_ledger_v2 (sku, change_qty, event_type, notes)
        SELECT sku, 5000, 'Initial Balance', 'System Migration Demo'
        FROM master_items_v2 WHERE type = 'Raw';

        -- Seed Some Finished Goods (healthy)
        INSERT INTO stock_ledger_v2 (sku, change_qty, event_type, notes)
        SELECT sku, 200, 'Initial Balance', 'System Migration Demo'
        FROM master_items_v2 WHERE type = 'FG' LIMIT 10;

        -- Seed a few "Low Stock" items (for alerts)
        -- We inserts negative adjustments to simulate usage if we had high stock, 
        -- but here we just insert small positive amounts.
        INSERT INTO stock_ledger_v2 (sku, change_qty, event_type, notes)
        SELECT sku, 10, 'Initial Balance', 'Critical Stock Demo'
        FROM master_items_v2 WHERE type = 'Raw' ORDER BY sku DESC LIMIT 3;
    END IF;
END $$;
