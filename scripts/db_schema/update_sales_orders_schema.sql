
-- Update sales_orders table to support Logistics V2 features
-- 1. delivery_address: To store the specific address for this order (independent of customer default)
-- 2. zone: To store the calculated delivery zone (North/Central/South etc) for AI routing

ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS delivery_address text,
ADD COLUMN IF NOT EXISTS zone text;

-- Optional: Comment on columns
COMMENT ON COLUMN public.sales_orders.delivery_address IS 'Specific delivery address for this order';
COMMENT ON COLUMN public.sales_orders.zone IS 'Delivery Zone (North, Central, South, etc.) for routing';
