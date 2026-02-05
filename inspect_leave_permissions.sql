SELECT *
FROM pg_policies
WHERE tablename = 'driver_leave';

-- Also check current records explicitly to see if they exist
SELECT * FROM driver_leave;
