
-- Update weights for Stretch Film items
UPDATE master_items_v2
SET net_weight_kg = 2.2, gross_weight_kg = 2.4
WHERE sku IN ('SF-22KG-BLACK', 'SF-22KG-CLEAR', 'SF-BLACK-SATUKOTAK6ROLL-22', 'SF-CLEAR-SATUKOTAK6ROLL-22', 'SF-GREY-SATUKOTAK6ROLL-22');

-- Also provide a default for reuse items just in case
UPDATE master_items_v2
SET net_weight_kg = 1.0, gross_weight_kg = 1.0
WHERE sku LIKE 'SF-REUSE%';
