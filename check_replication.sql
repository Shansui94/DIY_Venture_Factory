
SELECT
  relname,
  CASE
    WHEN relreplident = 'd' THEN 'default'
    WHEN relreplident = 'n' THEN 'nothing'
    WHEN relreplident = 'f' THEN 'full'
    WHEN relreplident = 'i' THEN 'index'
  END as replica_identity
FROM pg_class
WHERE relname = 'sales_orders';

-- Check if publication exists and if table is in it
select * from pg_publication_tables where tablename = 'sales_orders';
