DELETE FROM sys_machines_v2 
WHERE machine_id NOT IN ('N1-M01', 'N2-M02', 'T1.1-M03', 'T1.2-M01', 'T1.3-M02');
