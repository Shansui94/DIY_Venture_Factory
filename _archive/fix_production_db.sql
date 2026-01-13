-- ==========================================
-- PACKSECURE 数据库全量修复与初始化 (Multi-Factory & Machine)
-- ==========================================

-- 0. 开启 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 工厂表 (factories)
CREATE TABLE IF NOT EXISTS public.factories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    type TEXT DEFAULT 'Production', -- Production / Warehouse
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 机器表 (machines)
CREATE TABLE IF NOT EXISTS public.machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE, -- e.g. T1.1-M03
    name TEXT NOT NULL,
    factory_id UUID REFERENCES public.factories(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'Extruder',
    status TEXT DEFAULT 'Idle',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 物品主表 (items)
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('raw', 'product')),
    current_stock NUMERIC DEFAULT 0, -- 全局汇总库存
    unit TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 工厂分库库存 (factory_inventory)
CREATE TABLE IF NOT EXISTS public.factory_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
    factory_id UUID REFERENCES public.factories(id) ON DELETE CASCADE,
    quantity NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, factory_id)
);

-- 5. 机器级别实时产出 (machine_live_output) - 可选，用于细化监控
CREATE TABLE IF NOT EXISTS public.machine_live_output (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
    today_produced NUMERIC DEFAULT 0, -- 今日累计产出
    last_produced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(machine_id, item_id)
);

-- 6. 库存流水表 (inventory_transactions)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
    change_amount NUMERIC NOT NULL,
    action_type TEXT CHECK (action_type IN ('production_in', 'production_out', 'adjustment', 'purchase', 'sales_order')) NOT NULL,
    reference_id TEXT, -- Job ID
    factory_id UUID REFERENCES public.factories(id),
    machine_id UUID REFERENCES public.machines(id),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 生产日志 (production_logs)
CREATE TABLE IF NOT EXISTS public.production_logs (
    log_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    job_id TEXT,
    operator_email TEXT,
    output_qty NUMERIC,
    factory_id UUID REFERENCES public.factories(id),
    machine_id UUID REFERENCES public.machines(id),
    gps_coordinates TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 配方与详情 (recipes & recipe_items)
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipe_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
    material_id UUID REFERENCES public.items(id) ON DELETE RESTRICT NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    UNIQUE(recipe_id, material_id)
);

-- ==========================================
-- 确保旧表更新 (Migration for existing tables)
-- ==========================================
DO $$ 
BEGIN 
    -- 为 inventory_transactions 增加缺失字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_transactions' AND column_name='factory_id') THEN
        ALTER TABLE public.inventory_transactions ADD COLUMN factory_id UUID REFERENCES public.factories(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_transactions' AND column_name='machine_id') THEN
        ALTER TABLE public.inventory_transactions ADD COLUMN machine_id UUID REFERENCES public.machines(id);
    END IF;

    -- 修正 reference_id 类型 (从 UUID 转为 TEXT 以支持业务 Job ID)
    IF (SELECT data_type FROM information_schema.columns WHERE table_name='inventory_transactions' AND column_name='reference_id') = 'uuid' THEN
        ALTER TABLE public.inventory_transactions ALTER COLUMN reference_id TYPE TEXT USING reference_id::TEXT;
    END IF;

    -- 为 production_logs 增加缺失字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='production_logs' AND column_name='factory_id') THEN
        ALTER TABLE public.production_logs ADD COLUMN factory_id UUID REFERENCES public.factories(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='production_logs' AND column_name='machine_id') THEN
        ALTER TABLE public.production_logs ADD COLUMN machine_id UUID REFERENCES public.machines(id);
    END IF;
END $$;


-- ==========================================
-- 存储过程更新 (execute_production_run)
-- ==========================================
CREATE OR REPLACE FUNCTION public.execute_production_run(
  p_recipe_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL, -- 新增：作为配方缺失时的备选产品 ID
  p_quantity NUMERIC DEFAULT 0,
  p_reference_id TEXT DEFAULT NULL,
  p_factory_id UUID DEFAULT NULL,
  p_machine_id UUID DEFAULT NULL
) RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
  v_recipe RECORD;
  v_item RECORD;
  v_target_product_id UUID;
  v_recipe_name TEXT := '未定义配方';
BEGIN
  -- 1. 验证基本输入
  IF p_quantity <= 0 THEN RETURN json_build_object('success', false, 'message', '数量必须大于 0'); END IF;

  -- 2. 确定产品 ID 和配方信息
  IF p_recipe_id IS NOT NULL THEN
    SELECT * INTO v_recipe FROM public.recipes WHERE id = p_recipe_id;
    IF FOUND THEN
      v_target_product_id := v_recipe.product_id;
      v_recipe_name := v_recipe.name;
    ELSE
      -- 如果传了 ID 但没找到配方，看是否有备份产品 ID
      IF p_product_id IS NOT NULL THEN
        v_target_product_id := p_product_id;
      ELSE
        RETURN json_build_object('success', false, 'message', '指定的配方 ID 无效且未提供备选产品 ID');
      END IF;
    END IF;
  ELSE
    -- 没有配方 ID，必须有产品 ID
    IF p_product_id IS NOT NULL THEN
      v_target_product_id := p_product_id;
    ELSE
      RETURN json_build_object('success', false, 'message', '缺少配方 ID 或产品 ID');
    END IF;
  END IF;

  -- 3. 如果配方存在，执行扣减原材料逻辑 (BOM)
  IF v_recipe.id IS NOT NULL THEN
    FOR v_item IN SELECT * FROM public.recipe_items WHERE recipe_id = v_recipe.id LOOP
      -- 更新全局库存
      UPDATE public.items SET current_stock = current_stock - (v_item.quantity * p_quantity) WHERE id = v_item.material_id;
      -- 更新工厂库存
      IF p_factory_id IS NOT NULL THEN
        INSERT INTO public.factory_inventory (item_id, factory_id, quantity)
        VALUES (v_item.material_id, p_factory_id, -(v_item.quantity * p_quantity))
        ON CONFLICT (item_id, factory_id) DO UPDATE SET quantity = factory_inventory.quantity - (v_item.quantity * p_quantity), updated_at = now();
      END IF;
      -- 录入流水
      INSERT INTO public.inventory_transactions (item_id, change_amount, action_type, reference_id, factory_id, machine_id, note)
      VALUES (v_item.material_id, -(v_item.quantity * p_quantity), 'production_out', p_reference_id, p_factory_id, p_machine_id, '自动扣减 (配方: ' || v_recipe_name || ')');
    END LOOP;
  END IF;

  -- 4. 产成品入库 (无论有无配方都要产出)
  -- 更新全局主表
  UPDATE public.items SET current_stock = current_stock + p_quantity WHERE id = v_target_product_id;
  
  -- 更新工厂分库
  IF p_factory_id IS NOT NULL THEN
    INSERT INTO public.factory_inventory (item_id, factory_id, quantity)
    VALUES (v_target_product_id, p_factory_id, p_quantity)
    ON CONFLICT (item_id, factory_id) DO UPDATE SET quantity = factory_inventory.quantity + p_quantity, updated_at = now();
  END IF;
  
  -- 5. 更新机器当日统计
  IF p_machine_id IS NOT NULL THEN
    INSERT INTO public.machine_live_output (machine_id, item_id, today_produced)
    VALUES (p_machine_id, v_target_product_id, p_quantity)
    ON CONFLICT (machine_id, item_id) DO UPDATE SET today_produced = machine_live_output.today_produced + p_quantity, last_produced_at = now();
  END IF;

  -- 6. 录入产出流水
  INSERT INTO public.inventory_transactions (item_id, change_amount, action_type, reference_id, factory_id, machine_id, note)
  VALUES (v_target_product_id, p_quantity, 'production_in', p_reference_id, p_factory_id, p_machine_id, '生产完工 (配方: ' || v_recipe_name || ')');

  RETURN json_build_object(
    'success', true, 
    'message', '入库成功',
    'product_id', v_target_product_id,
    'has_recipe', (v_recipe.id IS NOT NULL)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ==========================================
-- 权限设置 (RLS) - 增加 DROP 以支持重复运行
-- ==========================================
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_inventory ENABLE ROW LEVEL SECURITY;

-- Factories
DROP POLICY IF EXISTS "Allow public read" ON public.factories;
CREATE POLICY "Allow public read" ON public.factories FOR SELECT USING (true);

-- Machines
DROP POLICY IF EXISTS "Allow public read" ON public.machines;
CREATE POLICY "Allow public read" ON public.machines FOR SELECT USING (true);

-- Production Logs
DROP POLICY IF EXISTS "Allow auth all" ON public.production_logs;
CREATE POLICY "Allow auth all" ON public.production_logs FOR ALL USING (auth.role() = 'authenticated');

-- Items
DROP POLICY IF EXISTS "Allow public read" ON public.items;
CREATE POLICY "Allow public read" ON public.items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow auth update" ON public.items;
CREATE POLICY "Allow auth update" ON public.items FOR UPDATE USING (auth.role() = 'authenticated');

-- Factory Inventory
DROP POLICY IF EXISTS "Allow auth all" ON public.factory_inventory;
CREATE POLICY "Allow auth all" ON public.factory_inventory FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- 9. 初始化物料与配方 (Materials & Recipes)
-- ==========================================

-- A. 创建原材料
INSERT INTO public.items (sku, name, type, unit, current_stock)
VALUES 
('RAW-LDPE-MAIN', 'LDPE Resin (Resin 主料)', 'raw', 'kg', 5000),
('RAW-MB-BLACK', 'Black Master Batch (黑色色母)', 'raw', 'kg', 500),
('RAW-MB-SILVER', 'Silver Master Batch (银色/灰色色母)', 'raw', 'kg', 500)
ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, unit = EXCLUDED.unit;

-- B. 自动生成配方逻辑 (针对现有所有产品)
DO $$
DECLARE
    v_product RECORD;
    v_ldpe_id UUID;
    v_black_mb_id UUID;
    v_silver_mb_id UUID;
    v_recipe_id UUID;
    -- 假设一个标准卷 (100cm等效) 约为 4kg
    v_weight_per_roll NUMERIC := 4.0; 
    v_ldpe_ratio_black NUMERIC := 500.0 / 516.0; -- 500kg LDPE / 516kg Total
    v_black_mb_ratio NUMERIC := 16.0 / 516.0;    -- 16kg MB / 516kg Total
BEGIN
    -- 获取原材料 ID
    SELECT id INTO v_ldpe_id FROM public.items WHERE sku = 'RAW-LDPE-MAIN';
    SELECT id INTO v_black_mb_id FROM public.items WHERE sku = 'RAW-MB-BLACK';
    SELECT id INTO v_silver_mb_id FROM public.items WHERE sku = 'RAW-MB-SILVER';

    -- 遍历所有产品进行配方初始化
    FOR v_product IN SELECT id, sku, name FROM public.items WHERE type = 'product' LOOP
        
        -- 1. 创建配方头 (如果不存在)
        INSERT INTO public.recipes (product_id, name, is_default, status)
        VALUES (v_product.id, 'Standard BOM', true, 'active')
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_recipe_id;

        -- 如果已存在配方，获取它
        IF v_recipe_id IS NULL THEN
            SELECT id INTO v_recipe_id FROM public.recipes WHERE product_id = v_product.id AND is_default = true LIMIT 1;
        END IF;

        -- 2. 清理旧配方项 (可选，为确保同步)
        DELETE FROM public.recipe_items WHERE recipe_id = v_recipe_id;

        -- 3. 根据 SKU 分类添加物料项
        IF v_product.sku LIKE '%-CLR-%' THEN
            -- 透明产品：100% LDPE
            INSERT INTO public.recipe_items (recipe_id, material_id, quantity)
            VALUES (v_recipe_id, v_ldpe_id, v_weight_per_roll);

        ELSIF v_product.sku LIKE '%-BLK-%' THEN
            -- 黑色产品：LDPE + 16kg/500kg mix
            INSERT INTO public.recipe_items (recipe_id, material_id, quantity)
            VALUES 
            (v_recipe_id, v_ldpe_id, v_weight_per_roll * v_ldpe_ratio_black),
            (v_recipe_id, v_black_mb_id, v_weight_per_roll * v_black_mb_ratio);

        ELSIF v_product.sku LIKE '%-SLV-%' THEN
            -- 银色/灰色产品 (之前的 Defect)
            -- 我们设定使用 LDPE + 极少量黑色色母，或专用银色色母 (此处演示用银色)
            INSERT INTO public.recipe_items (recipe_id, material_id, quantity)
            VALUES (v_recipe_id, v_ldpe_id, v_weight_per_roll);
        END IF;

    END LOOP;
END $$;
