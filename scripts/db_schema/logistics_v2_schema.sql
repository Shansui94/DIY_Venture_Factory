-- LOGISTICS V2 SCHEMA MIGRATION

-- 1. Create LOGISTICS_TRIPS Table
CREATE TABLE IF NOT EXISTS logistics_trips (
    trip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_number TEXT NOT NULL, -- e.g. T-2024-001
    driver_id UUID REFERENCES auth.users(id), -- Nullable initially if planned but unassigned
    vehicle_id TEXT REFERENCES sys_vehicles(id),
    status TEXT DEFAULT 'Planning', -- Planning, Loading, Ready, En-Route, Completed
    
    -- Metrics
    total_distance_km NUMERIC DEFAULT 0,
    total_weight_kg NUMERIC DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 2. Modify SALES_ORDERS Table (Add Logistics Fields)
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES logistics_trips(trip_id),
ADD COLUMN IF NOT EXISTS stop_sequence INT DEFAULT 999, -- 1, 2, 3...
ADD COLUMN IF NOT EXISTS pod_signature_url TEXT,
ADD COLUMN IF NOT EXISTS pod_photo_url TEXT,
ADD COLUMN IF NOT EXISTS pod_signed_by TEXT,
ADD COLUMN IF NOT EXISTS pod_timestamp TIMESTAMPTZ;

-- 3. RLS Policies for Logistics Trips

-- Enable RLS
ALTER TABLE logistics_trips ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated full access (consistent with current PERMISSIVE project policy)
DROP POLICY IF EXISTS "Enable all access for users" ON logistics_trips;

CREATE POLICY "Enable all access for users" 
ON logistics_trips 
FOR ALL 
TO authenticated, anon
USING (true) 
WITH CHECK (true);

-- 4. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_trip_id ON sales_orders(trip_id);
CREATE INDEX IF NOT EXISTS idx_logistics_trips_driver_id ON logistics_trips(driver_id);
