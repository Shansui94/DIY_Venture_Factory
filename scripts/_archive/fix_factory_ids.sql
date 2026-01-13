UPDATE sys_machines_v2 SET factory_id = 'N1' WHERE machine_id = 'N1-M01';
UPDATE sys_machines_v2 SET factory_id = 'N2' WHERE machine_id = 'N2-M02';
UPDATE sys_machines_v2 SET factory_id = 'T1' WHERE machine_id IN ('T1.1-M03', 'T1.2-M01', 'T1.3-M02');
