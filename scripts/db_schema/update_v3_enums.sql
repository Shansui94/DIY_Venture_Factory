-- EXPAND V3 ENUMS
-- Allows specific categories for new master data

-- 1. Add 'Spare' to Item Type (if not exists)
ALTER TYPE v2_item_type ADD VALUE IF NOT EXISTS 'Spare';

-- 2. Add New Categories
ALTER TYPE v2_item_category ADD VALUE IF NOT EXISTS 'SpareParts';
ALTER TYPE v2_item_category ADD VALUE IF NOT EXISTS 'Consumable';
ALTER TYPE v2_item_category ADD VALUE IF NOT EXISTS 'AirTube';
ALTER TYPE v2_item_category ADD VALUE IF NOT EXISTS 'AWB';
ALTER TYPE v2_item_category ADD VALUE IF NOT EXISTS 'CourierBag';
ALTER TYPE v2_item_category ADD VALUE IF NOT EXISTS 'BubbleWrap';
ALTER TYPE v2_item_category ADD VALUE IF NOT EXISTS 'Tape';
