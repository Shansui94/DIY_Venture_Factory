/*
  # V2 Database Schema Setup - Venture Factory
  # Based on: Global Data Architecture Specification V10
  # Strategy: Shadow Track (New tables parallel to old ones)
*/

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Define Enum Types (The Vocabulary)
-- Re-using existing types if possible, but creating specific V2 ones to be safe
CREATE TYPE v2_user_role AS ENUM ('Admin', 'Manager', 'Operator', 'Driver', 'Sales');
CREATE TYPE v2_item_type AS ENUM ('Raw', 'WiP', 'FG');
CREATE TYPE v2_item_category AS ENUM ('Resin', 'Additive', 'Packaging', 'Bag', 'StretchFilm', 'Trading');
CREATE TYPE v2_supply_type AS ENUM ('Manufactured', 'Purchased');
CREATE TYPE v2_machine_status AS ENUM ('Running', 'Idle', 'Maintenance', 'Off');
CREATE TYPE v2_delivery_status AS ENUM ('Pending', 'Loading', 'In_Transit', 'Delivered', 'Cancelled');

-- 3. Core Tables

-- 3.1 Users & Partners
CREATE TABLE IF NOT EXISTS sys_users_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Maps to auth.users.id if possible, or independent
    auth_user_id UUID REFERENCES auth.users(id), -- Link to Supabase Auth
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role v2_user_role NOT NULL DEFAULT 'Operator',
    department VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Active',
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_partners_v2 (
    partner_id VARCHAR(50) PRIMARY KEY, -- e.g., CUST-001
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- Customer, Supplier, Both
    contact_info JSONB,
    payment_terms VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_price_lists_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id VARCHAR(50) REFERENCES crm_partners_v2(partner_id),
    sku VARCHAR(50), -- Links to master_items later
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MYR',
    valid_until DATE
);

-- 3.2 Master Items (The Core)
CREATE TABLE IF NOT EXISTS master_items_v2 (
    sku VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type v2_item_type NOT NULL,
    category v2_item_category NOT NULL,
    supply_type v2_supply_type NOT NULL DEFAULT 'Manufactured',
    uom VARCHAR(10) DEFAULT 'Unit',
    
    -- Physical Specs
    width_mm INT,
    length_m INT,
    thickness_mic INT,
    net_weight_kg DECIMAL(10, 4),
    core_weight_kg DECIMAL(10, 4),
    gross_weight_kg DECIMAL(10, 4),
    
    -- Packaging & Logistics
    pack_qty INT, -- How many PCs/Rolls per bundle
    volume_cbm DECIMAL(10, 6), -- Volume per bundle
    box_dims VARCHAR(50), -- LxWxH
    
    -- Optimization
    min_stock_level DECIMAL(10, 2),
    reorder_qty DECIMAL(10, 2),
    estimated_cost DECIMAL(10, 2),
    
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 BOM Recipes (Multi-Version & Multi-Layer Support)
-- Header: Defines "Variant A" vs "Variant B" for the same product
CREATE TABLE IF NOT EXISTS bom_headers_v2 (
    recipe_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) REFERENCES master_items_v2(sku), -- The Finished Good
    name VARCHAR(100) NOT NULL, -- e.g. "Standard Single", "Double Layer Heavy"
    is_default BOOLEAN DEFAULT false,
    machine_type VARCHAR(50), -- e.g. "Extruder-Single", "Extruder-Double"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items: The ingredients for that specific version
CREATE TABLE IF NOT EXISTS bom_items_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID REFERENCES bom_headers_v2(recipe_id),
    material_sku VARCHAR(50) REFERENCES master_items_v2(sku),
    
    -- Layer Logic (Single, Inner, Outer, A, B)
    layer_name VARCHAR(20) DEFAULT 'Main', 
    
    qty_calculated DECIMAL(10, 4), -- Absolute amount e.g. 0.5kg (Optional)
    ratio_percentage DECIMAL(5, 2), -- Relative amount e.g. 40% (More flexible)
    
    notes TEXT
);

-- 3.4 Resources (Machines, Vehicles, Locations, Factories)
CREATE TABLE IF NOT EXISTS sys_factories_v2 (
    factory_id VARCHAR(50) PRIMARY KEY, -- FAC-01
    name VARCHAR(100) NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sys_machines_v2 (
    machine_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(50),
    status v2_machine_status DEFAULT 'Idle',
    factory_id VARCHAR(50) REFERENCES sys_factories_v2(factory_id), -- Link Machine to Factory
    current_operator_id UUID REFERENCES sys_users_v2(id)
);

CREATE TABLE IF NOT EXISTS sys_vehicles_v2 (
    vehicle_id VARCHAR(20) PRIMARY KEY, -- Plate Number
    type VARCHAR(50), -- 3 Ton, Van
    capacity_cbm DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'Available'
);

CREATE TABLE IF NOT EXISTS sys_locations_v2 (
    loc_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50),
    type VARCHAR(20), -- Raw Store, FG Store, Production Floor
    factory_id VARCHAR(50) REFERENCES sys_factories_v2(factory_id) -- Link Location to Factory
);

-- 4. Transactional Data

-- 4.1 Orders
CREATE TABLE IF NOT EXISTS sales_orders_v2 (
    order_id VARCHAR(50) PRIMARY KEY, -- SO-2024-001
    partner_id VARCHAR(50) REFERENCES crm_partners_v2(partner_id),
    order_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'Draft', -- Draft, Confirmed, Completed
    total_amount DECIMAL(12, 2)
);

CREATE TABLE IF NOT EXISTS sales_order_items_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(50) REFERENCES sales_orders_v2(order_id),
    sku VARCHAR(50) REFERENCES master_items_v2(sku),
    qty DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2),
    total_price DECIMAL(12, 2)
);

-- 4.2 Production
CREATE TABLE IF NOT EXISTS production_orders_v2 (
    job_id VARCHAR(50) PRIMARY KEY, -- JOB-1001
    sku VARCHAR(50) REFERENCES master_items_v2(sku),
    recipe_id UUID REFERENCES bom_headers_v2(recipe_id), -- Specific Recipe Version
    plan_qty DECIMAL(10, 2),
    due_date DATE,
    status VARCHAR(20) DEFAULT 'Scheduled',
    machine_id VARCHAR(50) REFERENCES sys_machines_v2(machine_id)
);

CREATE TABLE IF NOT EXISTS production_logs_v2 (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(50) REFERENCES production_orders_v2(job_id),
    sku VARCHAR(50) REFERENCES master_items_v2(sku),
    machine_id VARCHAR(50) REFERENCES sys_machines_v2(machine_id),
    operator_id UUID REFERENCES sys_users_v2(id),
    
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    
    output_qty DECIMAL(10, 2), -- Production Output
    reject_qty DECIMAL(10, 2) DEFAULT 0, -- QC Reject
    
    batch_code VARCHAR(100), -- Traceability
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.3 Logistics
CREATE TABLE IF NOT EXISTS logistics_deliveries_v2 (
    delivery_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id VARCHAR(20) REFERENCES sys_vehicles_v2(vehicle_id),
    driver_id UUID REFERENCES sys_users_v2(id),
    route_name VARCHAR(100),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status v2_delivery_status DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS delivery_items_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID REFERENCES logistics_deliveries_v2(delivery_id),
    order_id VARCHAR(50) REFERENCES sales_orders_v2(order_id), -- Link to SO
    status VARCHAR(20) DEFAULT 'Loaded'
);

-- 4.4 The Ledger (Inventory History)
CREATE TABLE IF NOT EXISTS stock_ledger_v2 (
    txn_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    sku VARCHAR(50) REFERENCES master_items_v2(sku),
    loc_id VARCHAR(50) REFERENCES sys_locations_v2(loc_id),
    
    change_qty DECIMAL(12, 4) NOT NULL,
    balance_after DECIMAL(12, 4), -- Optional snapshot
    
    event_type VARCHAR(50), -- Production, Sales, PO, Adjust
    ref_doc VARCHAR(50), -- Link to Job/SO/PO
    notes TEXT
);

-- 5. Enable RLS (Security)
ALTER TABLE sys_users_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_deliveries_v2 ENABLE ROW LEVEL SECURITY;

-- 5.1 Clean Policies (Examples)
-- Operator can only see jobs for their machine (Mock logic)
-- CREATE POLICY "Operators view assigned machine jobs" ON production_orders_v2
-- FOR SELECT USING (
--   EXISTS (SELECT 1 FROM sys_users_v2 WHERE id = auth.uid() AND role = 'Operator')
--   -- AND machine_id IN (...) -- logic to match operator to machine
-- );

-- Admin sees all
CREATE POLICY "Admins view all" ON sys_users_v2
FOR ALL USING (
    (SELECT role FROM sys_users_v2 WHERE auth_user_id = auth.uid()) = 'Admin'
);

-- Allow public read for setup (temporary, tighten later)
CREATE POLICY "Allow All for Dev" ON master_items_v2 FOR ALL USING (true);
CREATE POLICY "Allow All for Dev Users" ON sys_users_v2 FOR ALL USING (true);


-- 6. Grant Permissions (Crucial for Supabase)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- End of Setup Script
