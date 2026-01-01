INSERT INTO sys_factories_v2 (factory_id, name, address) VALUES
('N1', 'Nilai (Double Layer)', 'Nilai'),
('N2', 'Nilai (Single Layer)', 'Nilai'),
('T1', 'Taiping (Production)', 'Taiping')
ON CONFLICT (factory_id) DO NOTHING;
