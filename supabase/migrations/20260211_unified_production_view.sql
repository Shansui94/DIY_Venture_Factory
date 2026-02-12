-- Unified View for Production Logs (V1 + V2)
CREATE OR REPLACE VIEW v_production_logs_unified AS

-- Part 1: New V2 Data (Priority)
SELECT 
    log_id::text AS id,
    created_at,
    job_id,
    sku,
    output_qty AS quantity,
    machine_id,
    operator_id::text, 
    note,
    'v2' AS data_source
FROM production_logs_v2

UNION ALL

-- Part 2: Old V1 Data (Legacy)
SELECT 
    id::text,
    created_at,
    NULL AS job_id,
    product_sku AS sku,
    COALESCE(alarm_count, 1) AS quantity,
    machine_id,
    operator_id,
    NULL AS note,
    'v1' AS data_source
FROM production_logs;
