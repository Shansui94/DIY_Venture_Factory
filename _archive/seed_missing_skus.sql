
-- Seeding Missing SKUs for Production Control UI Compatibility
-- Formats: SF-{Size}-{Material}
-- Sizes: 100CM, 50CM, 33CM, 25CM, 20CM
-- Materials: CLEAR, BLACK, SILVER

INSERT INTO master_items_v2 (sku, name, type, unit, current_stock) VALUES
-- 100CM
('SF-100CM-CLEAR', 'Stretch Film 100cm Clear (Standard)', 'FG', 'Roll', 100),
('SF-100CM-BLACK', 'Stretch Film 100cm Black', 'FG', 'Roll', 50),
('SF-100CM-SILVER', 'Stretch Film 100cm Silver', 'FG', 'Roll', 50),

-- 50CM (Explicit, distinct from 22KG legacy)
('SF-50CM-CLEAR', 'Stretch Film 50cm Clear', 'FG', 'Roll', 500),
('SF-50CM-BLACK', 'Stretch Film 50cm Black', 'FG', 'Roll', 200),
('SF-50CM-SILVER', 'Stretch Film 50cm Silver', 'FG', 'Roll', 100),

-- 33CM
('SF-33CM-CLEAR', 'Stretch Film 33cm Clear', 'FG', 'Roll', 100),
('SF-33CM-BLACK', 'Stretch Film 33cm Black', 'FG', 'Roll', 50),
('SF-33CM-SILVER', 'Stretch Film 33cm Silver', 'FG', 'Roll', 20),

-- 25CM
('SF-25CM-CLEAR', 'Stretch Film 25cm Clear', 'FG', 'Roll', 100),
('SF-25CM-BLACK', 'Stretch Film 25cm Black', 'FG', 'Roll', 50),
('SF-25CM-SILVER', 'Stretch Film 25cm Silver', 'FG', 'Roll', 20),

-- 20CM
('SF-20CM-CLEAR', 'Stretch Film 20cm Clear', 'FG', 'Roll', 100),
('SF-20CM-BLACK', 'Stretch Film 20cm Black', 'FG', 'Roll', 50),
('SF-20CM-SILVER', 'Stretch Film 20cm Silver', 'FG', 'Roll', 20)

ON CONFLICT (sku) DO NOTHING;
