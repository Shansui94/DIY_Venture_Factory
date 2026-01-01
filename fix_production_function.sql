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
  v_recipe RECORD;
  v_item RECORD;
  v_target_product_id UUID;
  v_recipe_name TEXT := '未定义配方';
  v_has_recipe BOOLEAN := false; -- Add explicit flag
BEGIN
  -- 1. 验证基本输入
  IF p_quantity <= 0 THEN RETURN json_build_object('success', false, 'message', '数量必须大于 0'); END IF;

  -- 2. 确定产品 ID 和配方信息
  IF p_recipe_id IS NOT NULL THEN
    SELECT * INTO v_recipe FROM public.recipes WHERE id = p_recipe_id;
    IF FOUND THEN
      v_target_product_id := v_recipe.product_id;
      v_recipe_name := v_recipe.name;
      v_has_recipe := true; -- Mark as found
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
  IF v_has_recipe THEN
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
    'has_recipe', v_has_recipe
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
