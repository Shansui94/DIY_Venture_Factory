-- DIAGNOSTIC SCRIPT
-- Run this in Supabase SQL Editor to check system health

SELECT 
  '1. Total Products' as check_point, 
  COUNT(*)::text as result 
FROM public.items WHERE type = 'product'

UNION ALL

SELECT 
  '2. Total Recipes', 
  COUNT(*)::text 
FROM public.recipes

UNION ALL

SELECT 
  '3. Sample Recipe', 
  (SELECT name FROM public.recipes LIMIT 1) 

UNION ALL

SELECT 
  '4. Today Logs', 
  COUNT(*)::text 
FROM public.production_logs 
WHERE created_at > CURRENT_DATE

UNION ALL

SELECT
  '5. Last Log Error',
  COALESCE((SELECT note FROM public.production_logs ORDER BY created_at DESC LIMIT 1), 'No Logs')

ORDER BY check_point;
