
-- 1. 补全产品资料（含重量 0）
-- 用户确认先设为 0，以跳过验证
INSERT INTO master_items_v2 (sku, name, type, uom, category, net_weight_kg) VALUES
('BW20CM-DOUBLELAYER-BLACK-1', 'BW DL Black 20cm (1u)', 'FG', 'Roll', 'BubbleWrap', 0.0),
('BW20CM-DOUBLELAYER-BLACK-5', 'BW DL Black 20cm (5u)', 'FG', 'Roll', 'BubbleWrap', 0.0)
ON CONFLICT (sku) DO UPDATE SET net_weight_kg = EXCLUDED.net_weight_kg;

-- 2. 自动生成默认配方 (没有配方也会报错)
INSERT INTO bom_headers_v2 (sku, name, is_default, machine_type) VALUES
('BW20CM-DOUBLELAYER-BLACK-1', 'test', true, 'Extruder'),
('BW20CM-DOUBLELAYER-BLACK-5', 'test', true, 'Extruder')
ON CONFLICT DO NOTHING;
