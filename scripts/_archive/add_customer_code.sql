-- ADD CUSTOMER CODE COLUMN
-- Purpose: Store legacy system IDs (e.g. 302-C0001) while using UUID for internal operations.

ALTER TABLE sys_customers 
ADD COLUMN IF NOT EXISTS customer_code TEXT;

-- Optional: Add a comment
COMMENT ON COLUMN sys_customers.customer_code IS 'Legacy ID from external system / CSV import';
