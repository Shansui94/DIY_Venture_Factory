
-- seed_common_machines.sql
-- Insert common machine IDs to prevent FK errors from QR scans

INSERT INTO sys_machines_v2 (machine_id, name, type, factory_id, status)
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
ON CONFLICT (machine_id) DO NOTHING;
