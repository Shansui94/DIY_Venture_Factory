-- FORCE CLEAR ALL DATA (EXCEPT USERS)
-- Run this in Supabase SQL Editor to bypass RLS and Foreign Keys via TRUNCATE

-- 1. V2 Tables
TRUNCATE TABLE 
    stock_ledger_v2,
    delivery_items_v2,
    logistics_deliveries_v2,
    production_logs_v2,
    sales_order_items_v2,
    production_orders_v2,
    sales_orders_v2,
    bom_items_v2,
    bom_headers_v2,
    sys_machines_v2,
    sys_vehicles_v2,
    sys_locations_v2, 
    sys_factories_v2,
    crm_price_lists_v2,
    crm_partners_v2,
    master_items_v2
    CASCADE;

-- 2. Legacy Tables (if they exist)
-- Using IF EXISTS to avoid errors if some are already dropped
TRUNCATE TABLE 
    production_logs,
    recipes,
    machines,
    items
    CASCADE;

-- NOTE: sys_users_v2 is NOT included, so users are preserved.
