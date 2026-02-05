-- 修复 lorry_service_requests 的权限问题

-- 1. 允许所有已登录用户读取服务请求 (包括 Admin, Manager, Vivian)
-- 如果策略已存在，这一步可能会报错，但通常 Supabase 允许叠加 Permissive 策略
CREATE POLICY "Enable read access for all users"
ON "public"."lorry_service_requests"
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

-- 2. 允许司机创建请求
CREATE POLICY "Enable insert access for authenticated users"
ON "public"."lorry_service_requests"
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = driver_id);

-- 3. 允许管理人员更新状态 (Scheduled/Completed)
-- 这里简化为允许所有认证用户更新，实际生产可以限制 Role
CREATE POLICY "Enable update access for all users"
ON "public"."lorry_service_requests"
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (true);
