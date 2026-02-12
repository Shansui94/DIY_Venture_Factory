-- Support View for App.tsx (Inventory Dashboard)
-- Returns Items from V2 Master Table
-- Placeholder for Stock Ledger integration

DROP VIEW IF EXISTS v2_inventory_view;

CREATE OR REPLACE VIEW v2_inventory_view AS
SELECT 
    sku,
    name,
    -- Future: COALESCE((SELECT SUM(change_amount) FROM stock_ledger_v2 WHERE item_sku = m.sku), 0)
    0 as current_stock,
    category,
    status,
    uom as unit
FROM master_items_v2
WHERE status = 'Active';
