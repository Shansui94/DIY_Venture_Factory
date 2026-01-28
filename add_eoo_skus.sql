
INSERT INTO master_items_v2 (sku, name, type, category, supply_type, uom, status)
VALUES
('eoo-b17', 'eoo-b17', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-b20', 'eoo-b20', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-b25', 'eoo-b25', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-b28', 'eoo-b28', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-b32', 'eoo-b32', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-b35', 'eoo-b35', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-b38', 'eoo-b38', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-b40', 'eoo-b40', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-b45', 'eoo-b45', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-b50', 'eoo-b50', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-b60', 'eoo-b60', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),

('eoo-w17', 'eoo-w17', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-w20', 'eoo-w20', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-w25', 'eoo-w25', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-w28', 'eoo-w28', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-w32', 'eoo-w32', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-w35', 'eoo-w35', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-w38', 'eoo-w38', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-w40', 'eoo-w40', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-w45', 'eoo-w45', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-w50', 'eoo-w50', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active'),
('eoo-w60', 'eoo-w60', 'FG', 'Packaging', 'Manufactured', 'Unit', 'Active')
ON CONFLICT (sku) DO NOTHING;
