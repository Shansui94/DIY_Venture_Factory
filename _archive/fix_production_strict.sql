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
  v_recipe_record RECORD;
  v_item RECORD;
  v_target_product_id UUID;
  v_recipe_name TEXT;
  v_has_recipe BOOLEAN := false;
BEGIN
  -- 1. 验证输入
  IF p_quantity <= 0 THEN RETURN json_build_object('success', false, 'message', '数量必须大于 0'); END IF;

  -- 2. 查找配方
  -- 尝试通过 Recipe ID 或 Product ID 查找 *已激活* 的 *默认* 配方
  IF p_recipe_id IS NOT NULL THEN
    SELECT * INTO v_recipe_record FROM public.recipes WHERE id = p_recipe_id;
  ELSE
    IF p_product_id IS NOT NULL THEN
       -- 核心逻辑：必须找到一个 Active 且 Default 的配方
       SELECT * INTO v_recipe_record FROM public.recipes 
       WHERE product_id = p_product_id 
       AND is_default = true 
       AND status = 'active' 
       LIMIT 1;
    END IF;
  END IF;

  -- 3. [STRICT MODE] 检查配方是否存在
  IF v_recipe_record.id IS NOT NULL THEN
      v_target_product_id := v_recipe_record.product_id;
      v_recipe_name := v_recipe_record.name;
      v_has_recipe := true;
  ELSE
      -- 如果找不到配方，且传入了 product_id，我们为了获取产品名称报错，先查一下产品表
      IF p_product_id IS NOT NULL THEN
         SELECT name INTO v_recipe_name FROM public.items WHERE id = p_product_id;
         -- 返回明确的错误信息，阻止入库
         RETURN json_build_object(
             'success', false, 
             'message', '严重错误：产品 [' || COALESCE(v_recipe_name, '未知') || '] 缺少有效配方 (BOM)。系统拒绝入库以保护库存数据。'
         );
      ELSE
         RETURN json_build_object('success', false, 'message', '找不到指定的配方或产品。');
      END IF;
  END IF;

  -- 4. 执行原材料扣减 (只有在找到配方后才会执行到这里)
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
      VALUES (v_item.material_id, -(v_item.quantity * p_quantity), 'production_out', p_reference_id, p_factory_id, p_machine_id, '配方扣减: ' || v_recipe_name);
  END LOOP;

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
  VALUES (v_target_product_id, p_quantity, 'production_in', p_reference_id, p_factory_id, p_machine_id, '生产完工: ' || v_recipe_name);

  RETURN json_build_object(
    'success', true, 
    'message', '入库成功',
    'product_id', v_target_product_id,
    'recipe_name', v_recipe_name
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
