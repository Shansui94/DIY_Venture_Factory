CREATE OR REPLACE FUNCTION public.execute_production_run(
  p_recipe_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL,
  p_quantity NUMERIC DEFAULT 0,
  p_reference_id TEXT DEFAULT NULL,
  p_factory_id UUID DEFAULT NULL,
  p_machine_id UUID DEFAULT NULL
) RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
  v_recipe_record RECORD; -- Renamed to avoid confusion
  v_item RECORD;
  v_target_product_id UUID;
  v_recipe_name TEXT := '未定义配方';
  v_has_recipe BOOLEAN := false;
  
  -- Auto-Heal Variables
  v_mat_id UUID;
  v_new_recipe_id UUID;
BEGIN
  -- 1. 验证输入
  IF p_quantity <= 0 THEN RETURN json_build_object('success', false, 'message', '数量必须大于 0'); END IF;

  -- 2. 确定产品和配方
  -- A. 尝试通过 Recipe ID 查找
  IF p_recipe_id IS NOT NULL THEN
    SELECT * INTO v_recipe_record FROM public.recipes WHERE id = p_recipe_id;
    IF FOUND THEN
      v_target_product_id := v_recipe_record.product_id;
      v_recipe_name := v_recipe_record.name;
      v_has_recipe := true;
    ELSE
      IF p_product_id IS NOT NULL THEN
        v_target_product_id := p_product_id;
      ELSE
        RETURN json_build_object('success', false, 'message', '指定的配方 ID 无效且未提供备选产品 ID');
      END IF;
    END IF;
  ELSE
    -- B. 只有产品 ID
    IF p_product_id IS NOT NULL THEN
      v_target_product_id := p_product_id;
      -- 尝试查找默认配方
      SELECT * INTO v_recipe_record FROM public.recipes WHERE product_id = p_product_id AND is_default = true AND status = 'active' LIMIT 1;
      IF FOUND THEN
          v_recipe_name := v_recipe_record.name;
          v_has_recipe := true;
      END IF;
    ELSE
      RETURN json_build_object('success', false, 'message', '缺少配方 ID 或产品 ID');
    END IF;
  END IF;

  -- 3. [Critical Fix] Auto-Heal Logic: 如果没有配方，自动创建一个“标准配方”
  -- 这确保了新产品的生产也会扣减原材料，保护数据完整性。
  IF NOT v_has_recipe THEN
      -- 查找基础原料 (LDPE Resin)
      SELECT id INTO v_mat_id FROM public.items WHERE sku = 'RAW-LDPE-MAIN' LIMIT 1;
      
      IF v_mat_id IS NOT NULL THEN
          -- 创建标准配方头
          INSERT INTO public.recipes (product_id, name, is_default, status)
          VALUES (v_target_product_id, 'Standard Auto-Gen', true, 'active')
          RETURNING id INTO v_new_recipe_id;
          
          -- 创建配方详情 (默认假设：1卷产品 = 4kg 原料)
          INSERT INTO public.recipe_items (recipe_id, material_id, quantity)
          VALUES (v_new_recipe_id, v_mat_id, 4.0);
          
          -- 更新状态
          v_recipe_name := 'Standard Auto-Gen';
          v_has_recipe := true;
          
          -- 重新加载配方记录以便后续使用 ID
          SELECT * INTO v_recipe_record FROM public.recipes WHERE id = v_new_recipe_id;
      ELSE
          -- 如果连基础原料都找不到，必须报错，否则库存会乱
          RETURN json_build_object('success', false, 'message', '严重错误：无法找到基础原料 (RAW-LDPE-MAIN)，无法建立扣减规则。');
      END IF;
  END IF;

  -- 4. 执行原材料扣减 (BOM)
  -- 此时 v_has_recipe 一定为 true，除非基础原料缺失
  IF v_has_recipe THEN
    FOR v_item IN SELECT * FROM public.recipe_items WHERE recipe_id = v_recipe_record.id LOOP
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
  ELSE
    -- 理论上不应到达这里，除非 auto-heal 失败
    RETURN json_build_object('success', false, 'message', '逻辑错误：配方初始化失败');
  END IF;

  -- 5. 产成品入库
  UPDATE public.items SET current_stock = current_stock + p_quantity WHERE id = v_target_product_id;
  
  IF p_factory_id IS NOT NULL THEN
    INSERT INTO public.factory_inventory (item_id, factory_id, quantity)
    VALUES (v_target_product_id, p_factory_id, p_quantity)
    ON CONFLICT (item_id, factory_id) DO UPDATE SET quantity = factory_inventory.quantity + p_quantity, updated_at = now();
  END IF;
  
  IF p_machine_id IS NOT NULL THEN
    INSERT INTO public.machine_live_output (machine_id, item_id, today_produced)
    VALUES (p_machine_id, v_target_product_id, p_quantity)
    ON CONFLICT (machine_id, item_id) DO UPDATE SET today_produced = machine_live_output.today_produced + p_quantity, last_produced_at = now();
  END IF;

  INSERT INTO public.inventory_transactions (item_id, change_amount, action_type, reference_id, factory_id, machine_id, note)
  VALUES (v_target_product_id, p_quantity, 'production_in', p_reference_id, p_factory_id, p_machine_id, '生产完工 (配方: ' || v_recipe_name || ')');

  RETURN json_build_object(
    'success', true, 
    'message', '入库成功',
    'product_id', v_target_product_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
