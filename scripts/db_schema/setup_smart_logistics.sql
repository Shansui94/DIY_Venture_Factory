-- 1. Upgrade Factories with GPS Coordinates
ALTER TABLE sys_factories_v2 
ADD COLUMN IF NOT EXISTS lat float8,
ADD COLUMN IF NOT EXISTS lng float8;

-- Update existing defaults (Approximate locations for demo)
UPDATE sys_factories_v2 SET lat = 2.8167, lng = 101.7958 WHERE factory_id IN ('N1', 'N2'); -- Nilai
UPDATE sys_factories_v2 SET lat = 4.8500, lng = 100.7333 WHERE factory_id = 'T1'; -- Taiping

-- 2. Create/Update Customers Table
CREATE TABLE IF NOT EXISTS sys_customers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    address text,
    zone text, -- North, Central, South
    lat float8,
    lng float8,
    contact_person text,
    phone text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sys_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read customers" ON sys_customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage customers" ON sys_customers FOR ALL TO authenticated USING (true); -- Simplified for MVP

-- 3. Create Vehicles (Lorries) Table
CREATE TABLE IF NOT EXISTS sys_vehicles (
    id text PRIMARY KEY, -- e.g. 'V-01'
    plate_number text NOT NULL,
    driver_id uuid, -- Link to auth.users if assigned permanently
    status text DEFAULT 'Available', -- Available, On-Route, Maintenance
    
    -- Capacity Metrics
    max_volume_m3 float8 DEFAULT 0,
    max_weight_kg float8 DEFAULT 0,
    internal_dims text, -- e.g. "20x8x8 ft"
    
    current_location_lat float8,
    current_location_lng float8,
    last_updated timestamptz
);

-- Enable RLS
ALTER TABLE sys_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vehicles" ON sys_vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage vehicles" ON sys_vehicles FOR ALL TO authenticated USING (true);

-- Seed some Vehicles
INSERT INTO sys_vehicles (id, plate_number, max_volume_m3, max_weight_kg, internal_dims) VALUES
('TRUCK-01', 'JJU 1234', 15.5, 3000, '14ft Box'),
('TRUCK-02', 'BKA 8888', 25.0, 5000, '20ft Canvas'),
('TRUCK-03', 'WA 9090', 10.0, 1000, '10ft Van')
ON CONFLICT (id) DO NOTHING;

-- 4. Upgrade Items with Volume Metrics
ALTER TABLE master_items_v2
ADD COLUMN IF NOT EXISTS pack_length_cm float8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS pack_width_cm float8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS pack_height_cm float8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS volume_m3 float8 GENERATED ALWAYS AS ((pack_length_cm * pack_width_cm * pack_height_cm) / 1000000.0) STORED;

-- 5. Delivery Orders Table (Optimization)
CREATE TABLE IF NOT EXISTS logistics_delivery_orders (
    do_id text PRIMARY KEY, -- DO-2024-001
    job_ids text[], -- Array of linked Job IDs
    customer_id uuid,
    vehicle_id text references sys_vehicles(id),
    driver_id uuid,
    
    -- Route Info
    origin_factory_id text references sys_factories_v2(factory_id),
    destination_lat float8,
    destination_lng float8,
    distance_km float8,
    
    -- Load Info
    total_weight_kg float8,
    total_volume_m3 float8,
    
    status text DEFAULT 'Draft', -- Draft, Assigned, In-Transit, Delivered
    proof_of_delivery_img text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE logistics_delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read All DO" ON logistics_delivery_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage DO" ON logistics_delivery_orders FOR ALL TO authenticated USING (true);
