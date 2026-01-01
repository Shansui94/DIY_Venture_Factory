-- ==========================================
-- Setup Machine Database V2
-- Purpose: Create and Seed the sys_machines_v2 table
-- ==========================================

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.sys_machines_v2 (
    machine_id VARCHAR PRIMARY KEY, -- Main ID (e.g., 'M-01', 'Extruder 1')
    name VARCHAR NOT NULL,
    type VARCHAR DEFAULT 'Extruder',
    factory_id VARCHAR DEFAULT 'FAC-01',
    status VARCHAR DEFAULT 'Idle', -- 'Running', 'Idle', 'Maintenance', 'Offline'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Seed Data (Upsert to prevent duplicates)
INSERT INTO public.sys_machines_v2 (machine_id, name, type, factory_id, status)
VALUES 
    ('Machine 1', 'Generic Machine 1', 'Extruder', 'FAC-01', 'Idle'),
    ('Machine 2', 'Generic Machine 2', 'Extruder', 'FAC-01', 'Idle'),
    ('Machine 3', 'Generic Machine 3', 'Extruder', 'FAC-01', 'Idle'),
    ('M-01', 'Machine M-01', 'Extruder', 'FAC-01', 'Idle'),
    ('M-02', 'Machine M-02', 'Extruder', 'FAC-01', 'Idle'),
    ('Extruder 1', 'Extruder 1', 'Extruder', 'FAC-01', 'Idle'),
    ('Extruder 2', 'Extruder 2', 'Extruder', 'FAC-01', 'Idle'),
    ('EXT-01', 'EXT-01', 'Extruder', 'FAC-01', 'Idle'),
    ('EXT-02', 'EXT-02', 'Extruder', 'FAC-01', 'Idle')
ON CONFLICT (machine_id) DO UPDATE 
SET 
    name = EXCLUDED.name,
    type = EXCLUDED.type;

-- 3. Grant Permissions (Optional but recommended)
GRANT ALL ON TABLE public.sys_machines_v2 TO authenticated;
GRANT ALL ON TABLE public.sys_machines_v2 TO service_role;
