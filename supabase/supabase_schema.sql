-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Items Table (Master Data)
create table items (
  id uuid primary key default uuid_generate_v4(),
  sku text unique not null,
  name text not null,
  type text check (type in ('raw', 'product')) not null,
  current_stock numeric default 0,
  unit text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Recipes Table (Header)
create table recipes (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references items(id) on delete cascade not null,
  name text not null, -- e.g., "Standard Production" or "Alternative Material B"
  is_default boolean default false,
  status text check (status in ('active', 'draft', 'archived')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Recipe Items Table (Details)
create table recipe_items (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid references recipes(id) on delete cascade not null,
  material_id uuid references items(id) on delete restrict not null,
  quantity numeric not null check (quantity > 0), -- Amount required per 1 unit of product
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Inventory Transactions Table (Ledger)
create table inventory_transactions (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references items(id) on delete cascade not null,
  change_amount numeric not null, -- Positive for add, Negative for deduct
  action_type text check (action_type in ('production_in', 'production_out', 'adjustment', 'purchase', 'sales_order')) not null,
  reference_id uuid, -- Link to job_order_id, recipe_run_id, or sales_order_id
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Index for faster lookups
create index idx_items_sku on items(sku);
create index idx_recipes_product_id on recipes(product_id);
create index idx_recipe_items_recipe_id on recipe_items(recipe_id);
create index idx_inventory_transactions_item_id on inventory_transactions(item_id);

-- 5. Stored Procedure: Execute Production Run
-- This function handles the atomic deduction of raw materials and addition of finished goods.
-- Updated to support multi-factory inventory sync.
create or replace function execute_production_run(
  p_recipe_id uuid,
  p_quantity numeric, -- quantity of PRODUCT to produce
  p_reference_id uuid, -- e.g., Job Order ID
  p_factory_id uuid DEFAULT NULL -- NEW: Specific factory to update
) returns json as $$
declare
  v_recipe record;
  v_item record;
  v_product_id uuid;
  v_material_cost numeric;
begin
  -- 1. Validate inputs
  if p_quantity <= 0 then
    return json_build_object('success', false, 'message', 'Quantity must be positive');
  end if;

  -- 2. Fetch Recipe info
  select * into v_recipe from recipes where id = p_recipe_id;
  if not found then
    -- FALLBACK: If no recipe, we still want to record the production in the items table
    -- but we can't deduct materials. 
    -- However, for strict consistency, let's look for the product_id if the caller provides it?
    -- Actually, ProductionControl usually finds recipe by product SKU.
    return json_build_object('success', false, 'message', 'Recipe not found. Production cannot proceed without material deduction rules.');
  end if;
  v_product_id := v_recipe.product_id;

  -- 4. Deduct Materials (Loop through recipe items)
  for v_item in select * from recipe_items where recipe_id = p_recipe_id loop
    -- Insert Transaction (OUT)
    insert into inventory_transactions (item_id, change_amount, action_type, reference_id, note)
    values (
      v_item.material_id, 
      -(v_item.quantity * p_quantity), 
      'production_out', 
      p_reference_id, 
      'Consumed for recipe ' || v_recipe.name
    );

    -- 4.1 Update Item Global Stock
    update items 
    set current_stock = current_stock - (v_item.quantity * p_quantity)
    where id = v_item.material_id;

    -- 4.2 Update Factory Specific Stock (if factory provided)
    if p_factory_id is not null then
      insert into factory_inventory (item_id, factory_id, quantity)
      values (v_item.material_id, p_factory_id, -(v_item.quantity * p_quantity))
      on conflict (item_id, factory_id) do update 
      set quantity = factory_inventory.quantity - (v_item.quantity * p_quantity),
          updated_at = now();
    end if;
  end loop;

  -- 5. Add Finished Product (IN)
  insert into inventory_transactions (item_id, change_amount, action_type, reference_id, note)
  values (
    v_product_id, 
    p_quantity, 
    'production_in', 
    p_reference_id, 
    'Produced via recipe ' || v_recipe.name
  );

  -- 5.1 Update Product Global Stock
  update items 
  set current_stock = current_stock + p_quantity
  where id = v_product_id;

  -- 5.2 Update Product Factory Stock
  if p_factory_id is not null then
    insert into factory_inventory (item_id, factory_id, quantity)
    values (v_product_id, p_factory_id, p_quantity)
    on conflict (item_id, factory_id) do update 
    set quantity = factory_inventory.quantity + p_quantity,
        updated_at = now();
  end if;

  return json_build_object(
    'success', true, 
    'message', 'Production run executed successfully',
    'product_id', v_product_id,
    'quantity_produced', p_quantity,
    'factory_updated', p_factory_id
  );

exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql;
